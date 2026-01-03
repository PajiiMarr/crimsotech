"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Input } from '~/components/ui/input';
import { useToast } from '~/hooks/use-toast';
import { UserProvider as ClientUserProvider } from '~/components/providers/user-role-provider';
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  MapPin,
  Package,
  Truck,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  ShoppingBag,
  Wallet,
  Building,
  Printer,
  Eye,
  MoreVertical,
  Store,
  PackageCheck,
  RefreshCw,
  CheckSquare,
  Ban,
  Info,
  MessageSquare,
  ShieldAlert,
  ExternalLink,
  Upload,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Loader2,
  Hash
} from 'lucide-react';

// ========== TYPES ==========

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
  approved_refund_amount?: number | string | null;
  preferred_refund_method?: string | null;
  buyer_preferred_refund_method?: string | null;
  final_refund_method?: string | null;
  refund_payment_status?: string | null;
  seller_response?: string | null;
  customer_note?: string | null;
  tracking_number?: string | null;
  logistic_service?: string | null;
  refund_category?: 'return_item' | 'keep_item' | null;
  refund_type?: string | null;
  buyer_notified_at?: string | null;
  approved_at?: string | null;
  return_deadline?: string | null;
  buyer_return_deadline?: string | null;
  dispute_reason?: string | null;
  dispute_description?: string | null;
  dispute_filed_at?: string | null;

  // Return address provided by seller (for return-type refunds)
  return_address?: {
    id?: string;
    recipient_name?: string;
    contact_number?: string;
    country?: string;
    province?: string;
    city?: string;
    barangay?: string;
    street?: string;
    zip_code?: string;
    notes?: string;
    created_at?: string;
  } | null;

  dispute_request?: {
    id: string;
    status: string;
    created_at?: string | null;
    resolved_at?: string | null;
    reason?: string | null;
  } | null;

  // Backend uses related_name='dispute' on DisputeRequest; tolerate both shapes
  dispute?: {
    id: string;
    status: string;
    created_at?: string | null;
    resolved_at?: string | null;
    reason?: string | null;
  } | null;

  shop?: {
    id?: string;
    name?: string;
    is_suspended?: boolean;
  };

  requested_by_user?: {
    id?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;

  payment_details?: {
    wallet?: any;
    bank?: any;
    remittance?: any;
  } | null;

  return_request?: {
    return_id?: string;
    return_method?: string;
    logistic_service?: string | null;
    tracking_number?: string | null;
    status?: string;
    shipped_at?: string | null;
    received_at?: string | null;
    return_deadline?: string | null;
    notes?: string | null;
    media?: Array<{
      id: string;
      file_url?: string;
      file_type?: string;
      notes?: string;
      uploaded_at?: string;
    }>;
  } | null;

  processed_by?: { id?: string | null; username?: string | null; email?: string | null } | string | null;

  evidence?: Array<{
    id: string;
    url: string | null;
    file_type?: string | null;
    uploaded_by?: string | null;
    uploaded_at?: string | null;
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
    price?: number | null;
    total?: number | null;
    image?: string | null;
    product?: {
      id?: string;
      name?: string;
      description?: string;
      image?: string | null;
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
      media_files?: Array<{ file_url?: string }>;
    } | null;
  }>;

  delivery?: {
    status?: string;
    picked_at?: string | null;
    delivered_at?: string | null;
    tracking_number?: string | null;
  } | null;

  available_actions?: string[];
  // Structured counter requests and latest seller suggestion
  counter_requests?: Array<{
    counter_id?: string;
    requested_by?: string;
    seller_id?: string;
    seller_username?: string;
    counter_refund_method?: string | null;
    counter_refund_type?: string | null;
    counter_refund_amount?: number | null;
    notes?: string | null;
    status?: string;
    requested_at?: string;
    updated_at?: string;
  }>;
  seller_suggested_amount?: number | null;
  seller_suggested_method?: string | null;
  seller_suggested_type?: string | null;
}

type OrderItem = {
  checkout_id?: string;
  checkout_status?: string;
  checkout_total_amount?: number | null;
  checkout_quantity?: number;
  price?: number | null;
  total?: number | null;
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
    media_files?: Array<{ file_url?: string }>;
  } | null;
  cart?: any;
};

// ========== STATUS CONFIGURATION ==========

const STATUS_CONFIG: Record<string, any> = {
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
    icon: Clock,
    description: 'Review the request and decide to approve, reject, or negotiate',
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
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    icon: MessageCircle,
    description: 'Negotiating terms with customer',
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
    color: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    icon: CheckCircle,
    description: 'Return request approved',
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
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200',
    icon: Package,
    description: 'Waiting for customer to return the item',
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
  shipped: {
    label: 'In Transit',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    icon: Truck,
    description: 'Return is on the way',
    progress: 4,
    timeline: [
      { label: 'Return Scheduled', status: 'completed', icon: Calendar },
      { label: 'In Transit', status: 'current', icon: Truck },
      { label: 'Item Received', status: 'pending', icon: Package },
      { label: 'Verification', status: 'pending', icon: PackageCheck },
    ]
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    icon: Package,
    description: 'Seller has received the returned item',
    progress: 5,
    timeline: [
      { label: 'In Transit', status: 'completed', icon: Truck },
      { label: 'Item Received', status: 'current', icon: Package },
      { label: 'Quality Inspection', status: 'pending', icon: PackageCheck },
      { label: 'Inspection', status: 'pending', icon: CheckSquare },
    ]
  },
  inspected: {
    label: 'Inspected',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: PackageCheck,
    description: 'Item inspected — accept or reject the return',
    progress: 6,
    timeline: [
      { label: 'Item Received', status: 'completed', icon: Package },
      { label: 'Quality Inspection', status: 'completed', icon: PackageCheck },
      { label: 'Condition Assessment', status: 'current', icon: CheckCircle },
      { label: 'Decision', status: 'pending', icon: CheckSquare },
    ]
  },
  to_verify: {
    label: 'To Inspect',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: PackageCheck,
    description: 'Item received, needs inspection',
    progress: 5,
    timeline: [
      { label: 'Item Received', status: 'completed', icon: Package },
      { label: 'Quality Inspection', status: 'current', icon: PackageCheck },
      { label: 'Condition Assessment', status: 'pending', icon: CheckCircle },
      { label: 'Inspection Complete', status: 'pending', icon: CheckSquare },
    ]
  },
  to_process: {
    label: 'To Process',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: RefreshCw,
    description: 'Ready for refund processing',
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
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
    icon: AlertTriangle,
    description: 'Under admin review',
    progress: 3,
    timeline: [
      { label: 'Dispute Filed', status: 'completed', icon: AlertTriangle },
      { label: 'Admin Review', status: 'current', icon: ShieldAlert },
      { label: 'Decision Made', status: 'pending', icon: CheckCircle },
    ]
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
    icon: CheckSquare,
    description: 'Return and refund completed',
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
    color: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
    icon: XCircle,
    description: 'Request rejected',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Review Complete', status: 'completed', icon: CheckCircle },
      { label: 'Rejected', status: 'current', icon: XCircle },
    ]
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200',
    icon: Ban,
    description: 'Request cancelled',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Cancelled', status: 'current', icon: Ban },
    ]
  }
};

// ========== UTILITY FUNCTIONS ==========

function formatMoney(value: unknown) {
  try {
    const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  } catch {
    return '—';
  }
}

// Human-friendly label for method and optional type
function getMethodLabel(rawMethod?: string | null, rawType?: string | null) {
  if (!rawMethod) return null;
  let method = String(rawMethod).toLowerCase().trim();
  let type = rawType ? String(rawType).toLowerCase().trim() : null;
  // If method contains a type prefix like 'return:wallet' split it
  if (method.includes(':')) {
    const parts = method.split(':').map(p => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      type = type || parts[0];
      method = parts[1];
    }
  }

  const make = (tVal: string | null, m: string) => {
    if (tVal === 'keep') {
      if (m === 'wallet') return 'Keep Item & Partial Refund to Wallet';
      if (m === 'bank') return 'Keep Item & Partial Bank Transfer';
      if (m === 'remittance') return 'Keep Item & Partial Money Back';
      if (m === 'voucher') return 'Keep Item & Partial Refund Voucher';
    }
    if (tVal === 'return') {
      if (m === 'wallet') return 'Return Item & Refund to Wallet';
      if (m === 'bank') return 'Return Item & Bank Transfer';
      if (m === 'remittance') return 'Return Item & Money Back';
      if (m === 'voucher') return 'Return Item & Store Voucher';
    }
    // fallback to method label only
    if (m === 'wallet') return 'Refund to Wallet';
    if (m === 'bank') return 'Bank Transfer';
    if (m === 'remittance') return 'Money Back';
    if (m === 'voucher') return 'Store Voucher';
    return String(rawMethod);
  };

  return make(type, method);
}

// Best-effort requested amount for seller view; prefer explicit total_refund_amount, else sum of order items, else order_info.total_amount
function getRequestedAmount(refund: RefundDetails | null): number {
  if (!refund) return 0;
  if (refund.total_refund_amount != null) return Number(refund.total_refund_amount);
  const itemsTotal = (refund.order_items || []).reduce((sum: number, it: any) => {
    const t = (it.total != null) ? Number(it.total) : (it.price != null ? Number(it.price) * Number(it.checkout_quantity || it.checkout_quantity || 1) : 0);
    return sum + (Number.isFinite(t) ? t : 0);
  }, 0);
  if (itemsTotal > 0) return itemsTotal;
  if (refund.order_info?.total_amount != null) return Number(refund.order_info.total_amount);
  return 0;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
}

// Sanitize customer notes for display:
// - Remove any lines starting with "Seller approved:" (case-insensitive)
// - Trim, remove empty lines, deduplicate remaining lines while preserving order
// - Join with one blank line between entries for readability
function sanitizeCustomerNote(note?: string | null) {
  if (!note) return '';
  const lines = String(note).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const filtered = lines.filter(l => !/^seller approved:/i.test(l));
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const l of filtered) {
    const key = l.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(l);
    }
  }
  return unique.join('\n\n');
}

function apiUrlFor(path: string) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function getSelectedSku(item: OrderItem) {
  const optionMap = (item.product?.variants || []).reduce((acc: Record<string,string>, v: any) => {
    (v.options || []).forEach((opt: any) => acc[opt.id] = opt.title);
    return acc;
  }, {} as Record<string,string>);

  const qty = Number(item.checkout_quantity) || 1;
  const unitPriceFromTotal = item.checkout_total_amount && qty > 0 ? Number(item.checkout_total_amount) / qty : null;
  const unitPrice = unitPriceFromTotal ?? (item.product?.price ? Number(item.product.price) : null);

  const serverSku = (item as any).sku || (item as any).selected_sku || null;
  if (serverSku) {
    const selectedSku = {
      id: serverSku.sku_id || serverSku.id || null,
      sku_code: serverSku.sku_code || serverSku.sku_code || null,
      price: serverSku.price != null ? Number(serverSku.price) : null,
      image: serverSku.sku_image || serverSku.image || null,
      option_ids: serverSku.option_ids || null,
      option_map: serverSku.option_map || serverSku.optionMap || null,
    };
    const selectedOptionIds = Array.isArray(selectedSku.option_ids) ? selectedSku.option_ids : (selectedSku.option_ids ? [selectedSku.option_ids] : []);

    function findOptionTitleById(optId: any) {
      const idStr = String(optId);
      if (optionMap[idStr]) return optionMap[idStr];

      const variants = (item.product?.variants || []);
      for (const g of variants) {
        const found = (g.options || []).find((o: any) => String(o.id) === idStr);
        if (found) return found.title;
      }

      const skus = (item.product?.skus || []);
      for (const s of skus) {
        const om = (s as any).option_map || (s as any).optionMap || {};
        for (const val of Object.values(om || {})) {
          if (String(val) === idStr) {
            for (const g of variants) {
              const found = (g.options || []).find((o: any) => String(o.id) === idStr);
              if (found) return found.title;
            }
          }
        }
      }

      return null;
    }

    const titles = selectedOptionIds.map((id: any) => findOptionTitleById(id) || String(id));
    const humanLabel = titles.length ? titles.filter(Boolean).join(' • ') : null;
    const label = humanLabel || selectedSku.sku_code || 'SKU';
    return { selectedSku, label, unitPrice: selectedSku.price ?? unitPrice, selectedOptionIds, humanLabel };
  }

  let selectedSku: any = null;
  const cart = item.cart;
  const preferredOptionIds = cart?.selected_option_ids || cart?.option_ids || cart?.selected_options || null;
  const selectedSkuId = cart?.sku_id || cart?.selected_sku_id || null;

  if (selectedSkuId && item.product?.skus) {
    selectedSku = item.product.skus.find((s: any) => String(s.id) === String(selectedSkuId));
  }

  if (!selectedSku && preferredOptionIds && Array.isArray(preferredOptionIds) && preferredOptionIds.length && item.product?.skus) {
    selectedSku = item.product.skus.find((s: any) => {
      const skuIds = (s.option_ids || []).map((x: any) => String(x));
      return skuIds.length === preferredOptionIds.length && skuIds.sort().join(',') === preferredOptionIds.map(String).sort().join(',');
    });
  }

  if (!selectedSku && unitPrice != null && item.product?.skus) {
    selectedSku = item.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(unitPrice));
  }

  if (!selectedSku && item.product?.skus) {
    selectedSku = item.product.skus.find((s: any) => s.price != null && Number(s.price) === Number(item.product?.price));
  }

  if (!selectedSku && item.product?.skus) {
    selectedSku = item.product.skus[0];
  }

  const labelIds = Array.isArray(selectedSku?.option_ids) ? selectedSku.option_ids : (selectedSku?.option_ids ? [selectedSku.option_ids] : []);
  const labels = labelIds.map((id: any) => optionMap[id] || id).filter(Boolean);
  const label = labels.length ? labels.join(' • ') : (selectedSku?.sku_code || 'SKU');

  return { selectedSku, label, unitPrice };
}

function normalizeRefund(refundRaw: any): RefundDetails {
  function toAbsolute(u?: string | null): string | null {
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const path = u.startsWith('/') ? u : `/media/${u}`;
    return `http://127.0.0.1:8000${path}`;
  }

  const refund: RefundDetails = {
    ...refundRaw,
    preferred_refund_method: (refundRaw as any).buyer_preferred_refund_method || (refundRaw as any).preferred_refund_method || null,
    buyer_preferred_refund_method: (refundRaw as any).buyer_preferred_refund_method || null,
    final_refund_method: (refundRaw as any).final_refund_method || null,
    refund_payment_status: (refundRaw as any).refund_payment_status || null,
    refund_category: (refundRaw as any).refund_type === 'return' ? 'return_item' : (refundRaw as any).refund_type === 'keep' ? 'keep_item' : (refundRaw as any).refund_category || null,

    requested_by_user: (function() {
      const rb = (refundRaw as any).requested_by;
      if (!rb) {
        const fallbackName = (refundRaw as any).requested_by_username || (refundRaw as any).requested_by_name || (refundRaw as any).order?.customer_name || (refundRaw as any).order?.user_name || null;
        if (fallbackName) return { id: null, username: fallbackName };
        return null;
      }
      if (typeof rb === 'object') {
        return { id: rb.id || rb.user_id || null, username: rb.username || rb.name || rb.full_name || null, email: rb.email || null };
      }
      const fallbackUsername = (refundRaw as any).requested_by_username || (refundRaw as any).requested_by_name || (refundRaw as any).order?.customer_name || null;
      return { id: String(rb), username: fallbackUsername || null };
    })(),

    evidence: (refundRaw.evidence || []).map((m: any) => ({ 
      id: m.id, 
      file_type: m.file_type || null, 
      url: toAbsolute(m.file_url || m.url || m.file_data || null), 
      uploaded_by: m.uploaded_by_username || m.uploaded_by || m.uploader || null, 
      uploaded_at: m.uploaded_at || m.uploaded_at_iso || null 
    })),

    order_items: (refundRaw.order_items || []).map((it: any) => ({
      ...it,
      product: it.product ? {
        ...it.product,
        skus: ((it.product.skus || []) as any[]).concat((it as any).skus || []).map((s: any) => ({ ...s, image: toAbsolute(s.image) })),
        image: toAbsolute(it.product?.image || it.product_image || (it.product?.media_files && it.product.media_files[0] && it.product.media_files[0].file_url) || null),
        media_files: (it.product?.media_files || (it as any).product_media_files || []).map((m: any) => ({ file_url: toAbsolute(m.file_url || m.url || m.file_url) }))
      } : it.product,
      product_name: it.product?.name || it.product_name || it.name || it.title || null,
      image: toAbsolute(it.product_image || it.product?.image || (it.product?.skus && it.product.skus[0] && it.product.skus[0].image) || ((it as any).skus && (it as any).skus[0] && (it as any).skus[0].image) || null),
      price: it.price ?? (it.checkout_total_amount ?? null),
      total: it.total ?? (it.checkout_total_amount ?? null),
      checkout_quantity: it.checkout_quantity ?? (it.quantity ?? it.qty ?? null),
    })),

    order_info: {
      order_number: (refundRaw as any).order?.order_id || (refundRaw as any).order?.order || (refundRaw as any).order_number || null,
      order_id: (refundRaw as any).order?.order_id || (refundRaw as any).order?.order || (refundRaw as any).order_id || null,
      total_amount: (refundRaw as any).order?.total_amount ?? (refundRaw as any).order_total ?? null,
      user_id: (refundRaw as any).requested_by || (refundRaw as any).order?.user_id || null,
      created_at: (refundRaw as any).order?.created_at || null,
      payment_method: (refundRaw as any).order?.payment_method || null,
      delivery_method: (refundRaw as any).order?.delivery_method || null,
      shipping_address: {
        full_address: (refundRaw as any).order?.delivery_address_text || (refundRaw as any).order?.delivery_address || null,
        recipient_name: (refundRaw as any).order?.shipping_address?.recipient_name || null,
        recipient_phone: (refundRaw as any).order?.shipping_address?.recipient_phone || null,
      },
    },
  } as RefundDetails;

  return refund;
}

// ========== SEPARATED UI FUNCTIONS ==========

function PendingStatusUI() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="font-medium text-yellow-800">Review Required</p>
          <p className="text-sm text-yellow-700">
            Please review the refund request and decide to approve, reject, or make a counter offer within 48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

function NegotiationStatusUI({ refund }: { refund: RefundDetails }) {
  // Determine latest counter (if any)
  const latestCounter = (refund.counter_requests && refund.counter_requests.length > 0) ? refund.counter_requests[0] : null;
  const buyerAmount = getRequestedAmount(refund);
  const buyerType = refund.refund_type || (refund as any).refund_category || null;
  const buyerMethodLabel = getMethodLabel(refund.buyer_preferred_refund_method || refund.final_refund_method || null, buyerType) || '—';

  const sellerAmount = (refund.seller_suggested_amount != null) ? refund.seller_suggested_amount : (latestCounter?.counter_refund_amount ?? null);
  const sellerMethodLabel = getMethodLabel(refund.seller_suggested_method || latestCounter?.counter_refund_method || null, refund.seller_suggested_type || latestCounter?.counter_refund_type || null) || '—';
  const sellerType = refund.seller_suggested_type || latestCounter?.counter_refund_type || null;
  const sellerNotes = latestCounter?.notes || null;
  const sellerRequestedAt = latestCounter?.requested_at || null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="font-medium text-blue-800">Negotiation in Progress</p>
          <p className="text-sm text-blue-700">Waiting for customer to respond to your counter offer.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500">Buyer requested</div>
          <div className="mt-1 font-medium text-sm flex items-center gap-3">
            <span>{formatMoney(buyerAmount)}</span>
            {buyerType && <span className="text-xs text-gray-600 capitalize">{String(buyerType).replace('_', ' ')}</span>}
          </div>
          <div className="text-sm text-gray-600 mt-1">Method: <span className="font-medium">{buyerMethodLabel}</span></div>
          <div className="text-sm text-gray-600 mt-2">Reason: <span className="font-medium">{refund.reason || '—'}</span></div>
        </div>

        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500">Your offer</div>
          {sellerAmount != null ? (
            <div className="mt-1 font-medium text-sm">{formatMoney(sellerAmount)}</div>
          ) : (
            <div className="mt-1 font-medium text-sm text-gray-600">No amount proposed</div>
          )}

          <div className="text-sm text-gray-600 mt-1">Method: <span className="font-medium">{sellerMethodLabel}</span></div>
          {sellerType && <div className="text-sm text-gray-600 mt-1">Type: <span className="font-medium capitalize">{String(sellerType).replace('_', ' ')}</span></div>}

          {sellerNotes && (
            <div className="text-sm text-gray-700 mt-3">
              <div className="text-xs text-gray-500">Notes</div>
              <div className="mt-1">{sellerNotes}</div>
            </div>
          )}

          {sellerRequestedAt && (
            <div className="text-xs text-gray-500 mt-3">Sent: {formatDate(String(sellerRequestedAt))}</div>
          )}
        </div>
      </div>

      {(refund.approved_refund_amount != null || refund.final_refund_method) && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded">
          <div className="text-xs text-gray-500">Final agreement</div>
          <div className="mt-1 font-medium text-sm flex items-center gap-3">
            <span>{refund.approved_refund_amount != null ? formatMoney(refund.approved_refund_amount) : '—'}</span>
            {refund.final_refund_method && (
              <span className="text-xs text-gray-600 capitalize">Method: {String(refund.final_refund_method).replace('_', ' ')}</span>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function SellerRejectedStatusUI({ refund }: { refund: RefundDetails }) {
  const latestCounter = (refund.counter_requests && refund.counter_requests.length > 0) ? refund.counter_requests[0] : null;

  // If seller made a counter and buyer rejected it
  if (latestCounter && latestCounter.status === 'rejected') {
    const amt = latestCounter.counter_refund_amount;
    const rawMethod = latestCounter.counter_refund_method || '';
    const simpleMethod = rawMethod && String(rawMethod).includes(':') ? String(rawMethod).split(':').pop() : rawMethod;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Negotiation Closed</p>
            <p className="text-sm text-red-700 mt-1">Buyer rejected your counter-offer{amt != null ? ` of ${formatMoney(Number(amt))}` : ''}{simpleMethod ? ` via ${simpleMethod}` : ''}.</p>
            {latestCounter.notes && (
              <p className="text-xs text-red-600 mt-2">Your note: {latestCounter.notes}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show a plain rejected panel
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Request Rejected</p>
          <p className="text-sm text-red-700 mt-1">{refund.seller_response || 'Refund request was rejected'}</p>
        </div>
      </div>
    </div>
  );
}

function ApprovedStatusUI({ refund }: { refund: RefundDetails }) {
  const isReturnItem = refund.refund_category === 'return_item';
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();

  // If payment is completed but refund.status remains 'approved', show completed panel to seller
  if (String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'completed') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="font-medium text-emerald-800">Refund Payment Completed</p>
            <p className="text-sm text-emerald-700">Payment completed for this approved refund. See details below.</p>

            <div className="mt-3 text-sm text-gray-700 grid grid-cols-2 gap-2">
              <div>Amount: <strong>{formatMoney(getRequestedAmount(refund))}</strong></div>
              <div>Method: <strong>{refund.final_refund_method || refund.preferred_refund_method || '—'}</strong></div>
              <div>Refund ID: <span className="font-mono">{refund.refund || refund.id}</span></div>
              <div>Status: <strong className="capitalize">{refund.refund_payment_status || '—'}</strong></div>
            </div>

            <div className="mt-4">
              <ProofsDisplaySection refund={refund} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium text-green-800">Request Approved</p>
          <p className="text-sm text-green-700">
            {isReturnItem 
              ? 'Waiting for customer to return the item'
              : 'Ready to process refund payment'}
          </p>
        </div>
      </div>
    </div>
  );
}

function WaitingStatusUI({ refund }: { refund: RefundDetails }) {
  const tracking = refund.return_request?.tracking_number || refund.tracking_number || null;
  const notified = Boolean(refund.buyer_notified_at);

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-indigo-600" />
        <div>
          <p className="font-medium text-indigo-800">Waiting for Return</p>
          <p className="text-sm text-indigo-700">
            {tracking 
              ? `Tracking: ${tracking} (${refund.return_request?.logistic_service || 'Not specified'})` 
              : (notified ? 'Waiting for buyer to ship the item' : 'Customer will ship the return item')}
          </p>
        </div>
      </div>
    </div>
  );
}

function ToVerifyStatusUI({ refund }: { refund: RefundDetails }) {
  const refundStatus = String(refund.status || '').toLowerCase();
  const rrStatus = String(refund.return_request?.status || '').toLowerCase();
  const combined = `${refundStatus || '—'} + ${rrStatus || '—'}`;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <PackageCheck className="h-5 w-5 text-purple-600" />
        <div className="flex-1">
          <p className="font-medium text-purple-800">Item Inspection Required</p>

          <div className="mt-2">
            <p className="text-sm text-purple-700">
              You approved this refund request. Please inspect the returned item's condition and accept or reject the return.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceivedStatusUI({ refund }: { refund: RefundDetails }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="font-medium text-green-800">Received the Item</p>
          <p className="text-sm text-green-700">Received the item, proceed to inspect now.</p>
        </div>
      </div>
    </div>
  );
}

function ToProcessStatusUI({ refund }: { refund: RefundDetails }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-purple-600" />
        <div>
          <p className="font-medium text-purple-800">Ready for Refund Processing</p>
          <p className="text-sm text-purple-700">
            Item verified - Process the refund payment
          </p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-sm">Amount: <strong>{formatMoney(getRequestedAmount(refund))}</strong></span>
            <span className="text-sm">Method: <strong>{refund.final_refund_method || refund.preferred_refund_method}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisputeStatusUI({ refund }: { refund: RefundDetails }) {
  // Prefer `dispute` (backend related_name) but tolerate older `dispute_request` if present
  const dr = ((refund as any).dispute || (refund as any).dispute_request) || null;
  const created = dr?.created_at || (refund.dispute_filed_at || null);

  // If dispute has just been filed and not yet reviewed
  if (dr && String((dr.status || '').trim()).toLowerCase() === 'filed') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-800">Dispute Filed</p>
            <p className="text-sm text-orange-700 mt-1">A dispute has been filed for this refund. An administrator will review the case shortly.</p>
            {created && <p className="text-xs text-gray-500 mt-2">Filed at: {formatDate(String(created))}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Under review or other in-progress states
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-600" />
        <div>
          <p className="font-medium text-orange-800">Dispute Under Review</p>
          <p className="text-sm text-orange-700">Case is under administrative review.</p>
          {created && <p className="text-xs text-gray-500 mt-2">Filed at: {formatDate(String(created))}</p>}
        </div>
      </div>
    </div>
  );
}

function CompletedStatusUI({ refund }: { refund: RefundDetails }) {
  const processedBy = (refund as any).processed_by || null;
  const processedByName = typeof processedBy === 'string' ? processedBy : (processedBy?.username || processedBy?.id || '—');
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-5 w-5 text-emerald-600" />
        <div className="flex-1">
          <p className="font-medium text-emerald-800">Refund Completed</p>
          <p className="text-sm text-emerald-700">Refund completed on {formatDate(refund.processed_at)} by {processedByName}.</p>
          <div className="mt-3 text-sm text-gray-700 grid grid-cols-2 gap-2">
            <div>Amount: <strong>{formatMoney(refund.total_refund_amount)}</strong></div>
            <div>Method: <strong>{refund.final_refund_method || refund.preferred_refund_method || '—'}</strong></div>
            <div>Refund ID: <span className="font-mono">{refund.refund || refund.id}</span></div>
            <div>Status: <strong className="capitalize">{refund.refund_payment_status || '—'}</strong></div>
          </div>
          {/* Show uploaded proofs if any */}
          <div className="mt-4">
            <ProofsDisplaySection refund={refund} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingRefundUI({ refund, onProcess, onSetPaymentStatus, autoOpenDetails }: { refund: RefundDetails; onProcess?: () => Promise<boolean>; onSetPaymentStatus?: (setStatus: 'processing' | 'completed' | 'failed') => Promise<void>; autoOpenDetails?: boolean; }) {
  const [showRefundMethodDetails, setShowRefundMethodDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (autoOpenDetails) setShowRefundMethodDetails(true);
  }, [autoOpenDetails]);
  
  const refundMethod = refund.final_refund_method || refund.preferred_refund_method || refund.buyer_preferred_refund_method;
  const paymentDetails = refund.payment_details || {};

  const RefundMethodDetails = ({ refund }: { refund: RefundDetails }) => {
    const refundMethodLocal = (refund.final_refund_method || refund.preferred_refund_method || refund.buyer_preferred_refund_method || '').toString();
    if (!refundMethodLocal) return null;
    const method = refundMethodLocal.toLowerCase();

    if (method.includes('wallet') || method === 'platform_wallet' || method === 'wallet') {
      const walletInfo = paymentDetails.wallet || {};
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Wallet className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Platform Wallet Refund</p>
              <p className="text-sm text-blue-700">Amount will be credited to customer's wallet</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Customer Wallet ID</Label>
              <p className="font-medium text-sm">{walletInfo.wallet_id || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Account Owner</Label>
              <p className="font-medium text-sm">{walletInfo.owner_name || walletInfo.name || refund.requested_by_user?.username || '—'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (method.includes('bank') || method === 'bank_transfer' || method === 'bank') {
      const bankInfo = paymentDetails.bank || {};
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Building className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Bank Transfer</p>
              <p className="text-sm text-green-700">Transfer refund to customer's bank account</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Bank Name</Label>
              <p className="font-medium text-sm">{bankInfo.bank_name || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Account Name</Label>
              <p className="font-medium text-sm">{bankInfo.account_name || refund.requested_by_user?.username || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Account Number</Label>
              <p className="font-medium text-sm font-mono">{bankInfo.account_number || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Branch</Label>
              <p className="font-medium text-sm">{bankInfo.branch || '—'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (method.includes('remittance') || method === 'money_transfer') {
      const remittanceInfo = paymentDetails.remittance || {};
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">Remittance Center</p>
              <p className="text-sm text-purple-700">Send refund via remittance service</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Service Provider</Label>
              <p className="font-medium text-sm">{remittanceInfo.provider || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Receiver Name</Label>
              <p className="font-medium text-sm">{remittanceInfo.receiver_name || refund.requested_by_user?.username || '—'}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <CreditCard className="h-5 w-5 text-gray-600" />
        <div>
          <p className="font-medium text-gray-800">Refund Method: {refundMethodLocal}</p>
          <p className="text-sm text-gray-700">Process refund using the selected method</p>
        </div>
      </div>
    );
  };

  const buyerMethod = (refund.buyer_preferred_refund_method || '').toString();
  const buyerMethodLabel = buyerMethod ? buyerMethod.replace('_', ' ') : null;

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-purple-600" />
          <div>
            <p className="font-medium text-purple-800">Ready for Refund Processing</p>
            <p className="text-sm text-purple-700">Item verified - Process the refund payment</p>

        

            {/* Show detailed buyer payment details depending on selected method */}
            {buyerMethod && buyerMethod.toLowerCase().includes('wallet') && (
              <div className="mt-2 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Buyer eWallet Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Provider</div>
                    <div className="font-medium">{refund.payment_details?.wallet?.provider || refund.payment_details?.wallet?.wallet_provider || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account / Wallet ID</div>
                    <div className="font-medium">{refund.payment_details?.wallet?.account_number || refund.payment_details?.wallet?.wallet_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Owner</div>
                    <div className="font-medium">{refund.payment_details?.wallet?.owner_name || refund.payment_details?.wallet?.name || refund.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Notes</div>
                    <div className="font-medium">{refund.payment_details?.wallet?.notes || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {buyerMethod && (buyerMethod.toLowerCase().includes('bank') || buyerMethod.toLowerCase().includes('bank_transfer')) && (
              <div className="mt-2 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Bank Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Bank</div>
                    <div className="font-medium">{refund.payment_details?.bank?.bank_name || refund.payment_details?.bank?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Name</div>
                    <div className="font-medium">{refund.payment_details?.bank?.account_name || refund.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Number</div>
                    <div className="font-medium">{refund.payment_details?.bank?.account_number || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Branch / SWIFT</div>
                    <div className="font-medium">{refund.payment_details?.bank?.branch || refund.payment_details?.bank?.swift || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {buyerMethod && (buyerMethod.toLowerCase().includes('remittance') || buyerMethod.toLowerCase().includes('money_transfer') || buyerMethod.toLowerCase().includes('remit')) && (
              <div className="mt-2 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Remittance Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Provider</div>
                    <div className="font-medium">{refund.payment_details?.remittance?.provider || refund.payment_details?.remittance?.service || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Receiver Name</div>
                    <div className="font-medium">{refund.payment_details?.remittance?.receiver_name || refund.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Reference / Account</div>
                    <div className="font-medium">{refund.payment_details?.remittance?.reference || refund.payment_details?.remittance?.account || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Notes</div>
                    <div className="font-medium">{refund.payment_details?.remittance?.notes || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Refund Amount</p>
          <p className="text-xl font-bold text-green-600">
            {formatMoney(getRequestedAmount(refund))}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Payment Method</p>
          <p className="text-lg font-semibold capitalize">
            {refundMethod?.replace('_', ' ') || '—'}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Refund Type</p>
          <p className="text-lg font-semibold capitalize">
            {refund.refund_category?.replace('_', ' ') || '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRefundMethodDetails(!showRefundMethodDetails)}
          className="w-full flex items-center justify-between"
        >
          <span>Refund Method Details</span>
          {showRefundMethodDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {showRefundMethodDetails && (
          <div className="border rounded-lg p-4">
            <RefundMethodDetails refund={refund} />
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">To complete the refund, use the <span className="font-medium">Actions</span> panel on the right.</div>
    </div>
  );
}

function OrderItemsSection({ refund }: { refund: RefundDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Order Items</h3>
            <p className="text-sm text-gray-600">{refund.order_items?.length || 0} item(s)</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t">
          <div className="space-y-4">
            {refund.order_items?.map((item, idx) => {
              const skuInfo = getSelectedSku(item);
              return (
                <div key={idx} className="flex gap-4 p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded border bg-white overflow-hidden">
                      <img
                        src={item.image || skuInfo.selectedSku?.image || item.product?.image || '/placeholder.svg'}
                        alt={item.product?.name || 'Product'}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.product?.name || 'Product'}</p>
                        {skuInfo.humanLabel && (
                          <p className="text-xs text-gray-600 mt-1">{skuInfo.humanLabel}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatMoney(item.checkout_total_amount)}</p>
                        <p className="text-xs text-gray-600">Qty: {item.checkout_quantity || 1}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerDetailsSection({ refund }: { refund: RefundDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const customer = refund.requested_by_user;
  const order = refund.order_info;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Customer & Order Details</h3>
            <p className="text-sm text-gray-600">{customer?.username || 'Customer'}</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Customer Name</Label>
              <p className="font-medium text-sm">{customer?.username || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Email</Label>
              <p className="font-medium text-sm">{customer?.email || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Order Number</Label>
              <p className="font-medium text-sm">{order?.order_number || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Order Date</Label>
              <p className="font-medium text-sm">{formatDate(order?.created_at)}</p>
            </div>
          </div>

          {order?.shipping_address?.full_address && (
            <div className="mt-3">
              <Label className="text-sm text-gray-600">Shipping Address</Label>
              <div className="mt-1 bg-gray-50 p-3 rounded text-sm">
                {order.shipping_address.recipient_name && (
                  <p className="font-medium">{order.shipping_address.recipient_name}</p>
                )}
                {order.shipping_address.recipient_phone && (
                  <p className="text-gray-600">{order.shipping_address.recipient_phone}</p>
                )}
                <p className="text-gray-700 mt-1">{order.shipping_address.full_address}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceSection({ refund }: { refund: RefundDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!refund.evidence || refund.evidence.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Evidence</h3>
            <p className="text-sm text-gray-600">{refund.evidence.length} file(s)</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {refund.evidence.map((evidence, index) => (
              <a
                key={evidence.id}
                href={evidence.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border overflow-hidden hover:border-blue-300 transition-colors"
              >
                {evidence.file_type?.startsWith('image') ? (
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={evidence.url || ''}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU1RTUiLz48cGF0aCBkPSJNNTAgNzVMMTAwIDEyNUwxNTAgNzVINTBaIiBmaWxsPSIjQ0NDQ0NDIi8+PC9zdmc+';
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="p-2 border-t bg-white">
                  <div className="text-xs font-medium truncate">
                    {evidence.file_type || 'File'}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProofsUploadSection({ 
  refund, 
  selectedProofFiles, 
  proofPreviews, 
  proofNotes, 
  proofUploading,
  hasProofs,
  existingProofCount,
  maxProofsAllowed,
  remainingProofSlots,
  buttonEnabled,
  handleSelectedProofFiles,
  setProofNotes,
  removeSelectedFile,
  toast 
}: { 
  refund: RefundDetails;
  selectedProofFiles: File[];
  proofPreviews: string[];
  proofNotes: string;
  proofUploading: boolean;
  hasProofs: boolean;
  existingProofCount: number;
  maxProofsAllowed: number;
  remainingProofSlots: number;
  buttonEnabled: boolean;
  handleSelectedProofFiles: (files: File[]) => void;
  setProofNotes: (notes: string) => void;
  removeSelectedFile: (index: number) => void;
  toast: any;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Proofs</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Upload images as proof of refund</div>
          <div className="text-xs text-gray-500">{existingProofCount}/{maxProofsAllowed} uploaded{selectedProofFiles.length > 0 ? ` • ${selectedProofFiles.length} pending` : ''}</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="proof-upload-main"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (!files || files.length === 0) return;
              if (files.length > remainingProofSlots) {
                toast({ title: 'Notice', description: `You can only select ${remainingProofSlots} more proof(s).`, variant: 'destructive' });
                const allowed = files.slice(0, remainingProofSlots);
                handleSelectedProofFiles(allowed as File[]);
                return;
              }

              // Client-side validation
              const validFiles = files.filter((f) => {
                const isImage = f.type && f.type.startsWith('image/');
                const maxSize = 5 * 1024 * 1024;
                if (!isImage) {
                  toast({ title: 'Invalid file', description: `${f.name} is not an image`, variant: 'destructive' });
                  return false;
                }
                if (f.size > maxSize) {
                  toast({ title: 'File too large', description: `${f.name} exceeds 5MB`, variant: 'destructive' });
                  return false;
                }
                return true;
              });

              if (validFiles.length === 0) return;
              handleSelectedProofFiles(validFiles as File[]);
            }}
          />

          <div className="flex-1">
            <input
              placeholder="Notes (optional)"
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        {selectedProofFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {selectedProofFiles.map((f, i) => (
              <div key={i} className="relative">
                {f.type && f.type.startsWith('image') ? (
                  <img src={proofPreviews[i]} className="h-16 w-16 object-cover rounded" alt={`preview-${i}`} />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center border rounded text-xs px-2">
                    <div className="text-center">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(0)} KB</div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeSelectedFile(i)}
                  className="absolute -top-2 -right-2 bg-white rounded-full p-1 border"
                  type="button"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(refund as any).proofs && (refund as any).proofs.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium mb-2">Uploaded Proofs</div>
            <div className="grid grid-cols-4 gap-2">
              {(refund as any).proofs.map((p: any) => (
                <div key={p.id} className="relative">
                  {p.file_url && p.file_url.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/) ? (
                    <img src={p.file_url} className="h-16 w-16 object-cover rounded" alt={`proof-${p.id}`} />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center border rounded text-xs px-2">File</div>
                  )}
                  <div className="text-xs mt-1">{p.notes || ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasProofs && (
          <p className="mt-2 text-xs text-gray-500">Files will be uploaded when you click <strong>Complete Refund</strong>.</p>
        )}
      </div>
    </div>
  );
}

// Read-only proofs display (used on Completed tab)
function ProofsDisplaySection({ refund }: { refund: RefundDetails }) {
  if (!(refund as any).proofs || (refund as any).proofs.length === 0) return null;
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-medium mb-3">Uploaded Proofs</h3>
      <div className="grid grid-cols-4 gap-2">
        {(refund as any).proofs.map((p: any) => (
          <div key={p.id} className="relative">
            {p.file_url && p.file_url.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/) ? (
              <img src={p.file_url} className="h-24 w-24 object-cover rounded" alt={`proof-${p.id}`} />
            ) : (
              <div className="h-24 w-24 flex items-center justify-center border rounded text-xs px-2">File</div>
            )}
            <div className="text-xs mt-1">{p.notes || ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestDetailsSection({ refund }: { refund: RefundDetails }) {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="font-medium text-lg mb-4">Request Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Refund Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Refund Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatMoney(getRequestedAmount(refund))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Refund Type:</span>
                <span className="text-sm font-medium capitalize">
                  {refund.refund_category?.replace('_', ' ') || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Preferred Method:</span>
                <span className="text-sm font-medium capitalize">
                  {refund.preferred_refund_method?.replace('_', ' ') || '—'}
                </span>
              </div>
              {refund.refund_payment_status && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Status:</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {refund.refund_payment_status}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Requested:</span>
                <span>{formatDate(refund.requested_at)}</span>
              </div>
              {refund.approved_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Approved:</span>
                  <span>{formatDate(refund.approved_at)}</span>
                </div>
              )}
              {refund.processed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Processed:</span>
                  <span>{formatDate(refund.processed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reason for Refund</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">{refund.reason || 'No reason provided'}</p>
            </div>
          </div>

          {refund.customer_note && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Customer Notes</h3>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="whitespace-pre-wrap text-sm">{sanitizeCustomerNote(refund.customer_note)}</div>
              </div>
            </div>
          )}

          {refund.seller_response && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Response</h3>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-sm">{refund.seller_response}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderSection({ 
  refund, 
  statusConfig, 
  StatusIcon, 
  navigate, 
  backTo, 
  shopId 
}: { 
  refund: RefundDetails;
  statusConfig: any;
  StatusIcon: any;
  navigate: any;
  backTo: string;
  shopId: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backTo)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Refund Request Details</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>#{refund.request_number || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              <span>Order #{refund.order_info?.order_number || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              <span>Total: <strong className="ml-1">{formatMoney(getRequestedAmount(refund))}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`px-3 py-1 ${statusConfig.color}`}
        >
          <StatusIcon className="h-4 w-4 mr-1.5" />
          {statusConfig.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Customer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(backTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ActionsSection({ 
  renderStatusActions, 
  refund, 
  navigate 
}: { 
  renderStatusActions: any;
  refund: RefundDetails;
  navigate: any;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Actions</h3>
      {renderStatusActions}

      <Separator className="my-3" />

      {/* Common Actions */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/chat/customer/${refund.order_info?.user_id}`)}
          className="w-full justify-start"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Customer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}
          className="w-full justify-start"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Order Details
        </Button>
      </div>
    </div>
  );
}

function SummarySection({ refund }: { refund: RefundDetails }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Order Total</span>
          <span className="text-sm font-medium">{formatMoney(refund.order_info?.total_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Refund Amount</span>
          <span className="text-sm font-bold text-green-600">{formatMoney(getRequestedAmount(refund))}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Refund Method</span>
          <span className="text-sm font-medium capitalize">
            {refund.final_refund_method || refund.preferred_refund_method || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Refund Type</span>
          <span className="text-sm font-medium capitalize">
            {refund.refund_category?.replace('_', ' ') || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({ statusConfig }: { statusConfig: any }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Status Timeline</h3>
      <div className="space-y-3">
        {statusConfig.timeline?.map((step: any, index: number) => {
          const StepIcon = step.icon;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          
          return (
            <div key={index} className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted ? 'bg-green-100' :
                isCurrent ? 'bg-blue-100' :
                'bg-gray-100'
              }`}>
                <StepIcon className={`h-3 w-3 ${
                  isCompleted ? 'text-green-600' :
                  isCurrent ? 'text-blue-600' :
                  'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium ${
                  isCurrent ? 'text-blue-700' :
                  isCompleted ? 'text-green-700' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RejectModal({ 
  showRejectModal, 
  setShowRejectModal, 
  rejectReason, 
  setRejectReason, 
  isProcessing, 
  handleRejectSubmit 
}: { 
  showRejectModal: boolean;
  setShowRejectModal: (show: boolean) => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  isProcessing: boolean;
  handleRejectSubmit: () => Promise<void>;
}) {
  return (
    <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Reject Refund Request
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this refund request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason for Rejection</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why you're rejecting this request..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Rejecting a refund request may lead to customer disputes.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRejectSubmit}
            disabled={!rejectReason.trim() || isProcessing}
          >
            {isProcessing ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Counter Offer Modal component
function CounterOfferModal({ show, setShow, refund, userId, shopId, setRefund, fetchLatestRefund }: { show: boolean; setShow: (s: boolean) => void; refund?: RefundDetails | undefined; userId: string | number; shopId?: string | undefined; setRefund: (r: RefundDetails) => void; fetchLatestRefund: () => Promise<void> }) {
  const { toast } = useToast();
  // Provide both Return and Keep grouped options similar to customer selection
  const METHODS = ['wallet', 'bank', 'remittance', 'voucher'];

  const normalizeMethod = (raw?: string | null) => {
    if (!raw) return 'wallet';
    const candidate = String(raw).toLowerCase().trim();
    if (METHODS.includes(candidate)) return candidate;
    // try to infer from display labels
    if (candidate.includes('wallet') || candidate.includes('e-wallet') || candidate.includes('ewallet') ) return 'wallet';
    if (candidate.includes('bank')) return 'bank';
    if (candidate.includes('remittance') || candidate.includes('money')) return 'remittance';
    if (candidate.includes('voucher') || candidate.includes('store')) return 'voucher';
    return 'wallet';
  };

  const defaultMethodWithType = `${(refund?.refund_type as string) || 'return'}:${normalizeMethod((refund?.buyer_preferred_refund_method as string) || 'wallet')}`;
  const [methodWithType, setMethodWithType] = useState<string>(defaultMethodWithType);
  const [notes, setNotes] = useState<string>('');
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabel = (type: string, method: string) => {
    if (type === 'keep') {
      switch (method) {
        case 'wallet': return 'Keep Item & Partial Refund to Wallet';
        case 'bank': return 'Keep Item & Partial Bank Transfer';
        case 'remittance': return 'Keep Item & Partial Money Back';
        case 'voucher': return 'Keep Item & Partial Store Voucher';
        default: return 'Keep Item';
      }
    }
    // return
    switch (method) {
      case 'wallet': return 'Return Item & Refund to Wallet';
      case 'bank': return 'Return Item & Bank Transfer';
      case 'remittance': return 'Return Item & Money Back';
      case 'voucher': return 'Return Item & Store Voucher';
      default: return 'Return Item';
    }
  };

  useEffect(() => {
    setMethodWithType(`${(refund?.refund_type as string) || 'return'}:${normalizeMethod((refund?.buyer_preferred_refund_method as string) || 'wallet')}`);
    setNotes('');
    setCounterAmount('');
  }, [refund]);

  // derive preview of selection for UI (be tolerant of values like 'wallet' or display labels)
  let previewType = '';
  let previewMethod = '';
  const _parts = String(methodWithType || '').split(':').map(p => p.trim()).filter(Boolean);
  if (_parts.length === 2) {
    previewType = _parts[0];
    previewMethod = _parts[1];
  } else if (_parts.length === 1) {
    const single = _parts[0];
    // If it's a known method key, treat it as method and default type to refund.refund_type
    if (METHODS.includes(single)) {
      previewMethod = single;
      previewType = (refund?.refund_type as string) || 'return';
    } else {
      // If it's a human label (e.g., 'Return Item & Refund to Wallet'), try to infer the method
      const inferred = normalizeMethod(single);
      previewMethod = inferred;
      previewType = (refund?.refund_type as string) || 'return';
    }
  } else {
    previewType = (refund?.refund_type as string) || 'return';
    previewMethod = (refund?.buyer_preferred_refund_method as string) || 'wallet';
  }

  const selectedType = previewType || ((refund?.refund_type as string) || 'return');
  const selectedMethod = previewMethod || ((refund?.buyer_preferred_refund_method as string) || 'wallet');
  const selectedLabel = typeLabel(selectedType, selectedMethod);

  const submit = async () => {
    if (!refund) return;
    if (!methodWithType) {
      toast({ title: 'Validation Error', description: 'Please select a refund method', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      console.debug('Debug Counter Offer submit: methodWithType=', methodWithType, 'refund=', refund);
      // Determine a safe refund id to use — avoid sending 'undefined' or invalid tokens
      const idToUse = (refund as any)?.refund_id || refund?.refund || refund?.id;
      if (!idToUse || ['undefined', 'null', 'none', 'nan', ''].includes(String(idToUse).toLowerCase())) {
        toast({ title: 'Invalid refund id', description: 'Refund identifier is missing or invalid. Please refresh the page and try again.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const url = apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/seller_respond_to_refund/`);
      // Send the full selection string (e.g. 'return:wallet' or 'keep:voucher') to persist exactly what seller chose in the dropdown.
      const selection = String(methodWithType || '').trim();
      const payload: any = { action: 'negotiate', counter_notes: notes };
      if (selection) {
        // Validate the selection's method part before sending; if invalid, skip sending method (message-only)
        const parts = selection.split(':').map(s => s.trim());
        const methodPart = parts.length === 2 ? parts[1].toLowerCase() : parts[0].toLowerCase();
        if (METHODS.includes(methodPart)) {
          payload.counter_refund_method = selection;
        } else {
          console.warn('Not including unknown counter method in payload (message-only):', selection);
        }
      }

      // If seller proposed an amount (required for keep/return offers), validate client-side before sending
      if (selectedType === 'keep' || selectedType === 'return') {
        if (!counterAmount || Number.isNaN(Number(counterAmount)) || Number(counterAmount) <= 0) {
          toast({ title: 'Validation Error', description: 'Please enter a positive counter refund amount', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        const amountVal = Number(Number(counterAmount).toFixed(2));
        // Basic client-side check: do not exceed order total if available
        const orderTotal = refund?.order_info?.total_amount != null ? Number(refund.order_info.total_amount) : null;
        if (orderTotal != null && amountVal > orderTotal) {
          toast({ title: 'Validation Error', description: 'Counter amount cannot exceed order total', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        payload.counter_refund_amount = amountVal;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) updatedRefund = normalizeRefund(data.refund);
        if (updatedRefund) setRefund(updatedRefund);
        else await fetchLatestRefund();

        toast({ title: 'Success', description: 'Counter offer sent to buyer' });
        // brief delay to allow UI update, then close
        setTimeout(() => setShow(false), 120);
      } else {
        const text = await resp.text().catch(() => 'Failed to send counter offer');
        throw new Error(text || 'Failed to send counter offer');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to send counter offer', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Make Counter Offer
          </DialogTitle>
          <DialogDescription>
            Propose a refund method to the buyer. Choices default to buyer's preferred method.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-sm">Choose Refund Method & Type</Label>
            <select aria-label="Choose refund type and method" className="mt-1 block w-full rounded-md border p-2" value={methodWithType} onChange={(e) => setMethodWithType(e.target.value)}>
              <optgroup label="Return Item">
                {METHODS.map(m => (
                  <option key={`return:${m}`} value={`return:${m}`}>{typeLabel('return', m)}</option>
                ))}
              </optgroup>
              <optgroup label="Keep Item (Partial)">
                {METHODS.map(m => (
                  <option key={`keep:${m}`} value={`keep:${m}`}>{typeLabel('keep', m)}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {(selectedType === 'keep' || selectedType === 'return') && (
            <div>
              <Label className="text-sm">Proposed Refund Amount</Label>

              <div className="mt-1 flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder={refund?.order_info?.total_amount ? `Max ${formatMoney(refund.order_info.total_amount)}` : 'Amount (e.g., 100.00)'}
                />

                {/* Quick action: show buyer requested amount and allow using it */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">Buyer requested:</div>
                  <div className="text-sm font-medium">{formatMoney(getRequestedAmount(refund || null))}</div>
                  <Button size="sm" variant="outline" onClick={() => setCounterAmount(String(Number(getRequestedAmount(refund || null)).toFixed(2)))} className="h-8">Use buyer amount</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const full = (refund && refund.order_info && refund.order_info.total_amount != null) ? Number(refund.order_info.total_amount) : getRequestedAmount(refund || null);
                    setCounterAmount(String(Number(full).toFixed(2)));
                  }} className="h-8">Full refund</Button>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">Enter the amount you propose to refund if buyer keeps the item or returns it. Must be positive and not exceed order total.</p>
            </div>
          )}

          <div className="mt-2 text-sm text-gray-600">
            <div className="font-medium">Preview</div>
            <div className="text-sm text-gray-700 mt-1">{selectedLabel}{selectedType === 'keep' && counterAmount ? (` — Amount: ${formatMoney(Number(counterAmount))}`) : null}</div>
          </div>
        </div>

        <DialogFooter className="mt-6 sm:flex-row flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShow(false)}>Cancel</Button>
            <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={isSubmitting} aria-label="Send counter offer">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Offer
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ReturnAddressSection({
  showReturnAddressSection,
  setShowReturnAddressSection,
  refund,
  returnAddressForm,
  handleReturnAddressChange,
  addrSubmitting,
  handleSubmitReturnAddress
}: {
  showReturnAddressSection: boolean;
  setShowReturnAddressSection: (show: boolean) => void;
  refund: RefundDetails;
  returnAddressForm: any;
  handleReturnAddressChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  addrSubmitting: boolean;
  handleSubmitReturnAddress: () => Promise<void>;
}) {
  return (
    <Dialog open={showReturnAddressSection} onOpenChange={setShowReturnAddressSection}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Provide Return Address</DialogTitle>
          <DialogDescription>Enter the address where the buyer should ship the item. Submitting will confirm the approval.</DialogDescription>
        </DialogHeader>

        {refund?.return_address && (
          <div className="mt-3 p-3 bg-gray-50 border rounded">
            <p className="text-sm font-medium">Current Return Address</p>
            <p className="text-sm text-gray-700">{refund.return_address.recipient_name} — {refund.return_address.contact_number}</p>
            <p className="text-sm text-gray-700">{refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}</p>
            {refund.return_address.notes && <p className="text-sm text-gray-600 mt-1">{refund.return_address.notes}</p>}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input name="recipient_name" value={returnAddressForm.recipient_name} onChange={handleReturnAddressChange} placeholder="Recipient name" />
            <Input name="contact_number" value={returnAddressForm.contact_number} onChange={handleReturnAddressChange} placeholder="Contact number" />
            <Input name="country" value={returnAddressForm.country} onChange={handleReturnAddressChange} placeholder="Country" />
            <Input name="province" value={returnAddressForm.province} onChange={handleReturnAddressChange} placeholder="Province" />
            <Input name="city" value={returnAddressForm.city} onChange={handleReturnAddressChange} placeholder="City" />
            <Input name="barangay" value={returnAddressForm.barangay} onChange={handleReturnAddressChange} placeholder="Barangay" />
            <Input name="street" value={returnAddressForm.street} onChange={handleReturnAddressChange} placeholder="Street" />
            <Input name="zip_code" value={returnAddressForm.zip_code} onChange={handleReturnAddressChange} placeholder="Zip code" />
          </div>

          <Textarea name="notes" value={returnAddressForm.notes} onChange={handleReturnAddressChange} placeholder="Notes (optional)" />
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setShowReturnAddressSection(false)}>Cancel</Button>
            <Button onClick={handleSubmitReturnAddress} disabled={addrSubmitting}>{addrSubmitting ? 'Saving...' : 'Confirm and Send to Buyer'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== META & LOADER ==========

export function meta() {
  return [{ title: 'View Refund Details' }];
}

export async function loader({ request, context, params }: { request: Request; context: any; params?: Record<string, string | undefined> }) {
  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
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

  const { commitSession } = await import('~/sessions.server');
  if (shopId && typeof shopIdFromSession !== 'string') {
    session.set('shopId', shopId);
  }

  if (!refundId) {
    throw new Response('refund_id is required', { status: 400 });
  }

  if (!shopId) {
    throw new Response('shop_id is required', { status: 400 });
  }

  if (/\./.test(refundId)) {
    throw new Response('Invalid refund identifier', { status: 400 });
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const endpoint = `${API_BASE_URL}/return-refund/${refundId}/get_seller_refund_details/?shop_id=${encodeURIComponent(String(shopId))}`;
  
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User-Id': String(userId),
      'X-Shop-Id': String(shopId),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Response(text || 'Failed to load refund details', { status: res.status });
  }

  const refundRaw: RefundDetails = await res.json();

  const refund: RefundDetails = normalizeRefund(refundRaw);

  const user = {
    id: userId,
    isAdmin: false,
    isCustomer: true,
    isRider: false,
    isModerator: false,
  };

  if ((refundRaw as any).processed_by && typeof (refundRaw as any).processed_by === 'object') {
    (refund as any).processed_by = {
      id: (refundRaw as any).processed_by.id || (refundRaw as any).processed_by,
      username: (refundRaw as any).processed_by.username || null,
      email: (refundRaw as any).processed_by.email || null,
    };
  }

  return {
    userId,
    shopId,
    refundId,
    refund,
    user
  };
}

// ========== MAIN COMPONENT ==========

export default function ViewRefundDetails() {
  const { shopId, refund: initialRefund, user, refundId: loaderRefundId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suggestedMethod, setSuggestedMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [refund, setRefund] = useState(initialRefund);
  // Proofs may not be typed on RefundDetails; check safely
  const existingProofCount = (refund && (refund as any).proofs ? (refund as any).proofs.length : 0);
  const hasProofs = existingProofCount > 0;
  const maxProofsAllowed = 4;
  const remainingProofSlots = Math.max(0, maxProofsAllowed - existingProofCount);

  // Inline proof uploader state
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofUploading, setProofUploading] = useState(false);

  // compute button enablement based on existing uploaded proofs or selected pending files
  const serverProofCount = (refund as any)?.proofs?.length ?? 0;
  const buttonEnabled = serverProofCount > 0 || (selectedProofFiles || []).length > 0;

  useEffect(() => {
    // debug logging to help trace why button might be disabled
    console.log('Debug: serverProofCount=', serverProofCount, 'selectedProofFiles=', (selectedProofFiles || []).length, 'buttonEnabled=', buttonEnabled);
  }, [serverProofCount, (selectedProofFiles || []).length]);
  
  // Return address modal state
  const [showReturnAddressSection, setShowReturnAddressSection] = useState(false);
  const [returnAddressForm, setReturnAddressForm] = useState({
    recipient_name: '',
    contact_number: '',
    country: 'Philippines',
    province: '',
    city: '',
    barangay: '',
    street: '',
    zip_code: '',
    notes: ''
  });
  const [addrSubmitting, setAddrSubmitting] = useState(false);
  // When set, indicates that after saving the return address we should automatically submit the pending counter offer
  const [pendingCounterOffer, setPendingCounterOffer] = useState(false);

  const openReturnAddressDialog = (prefill?: any) => {
    if (prefill) {
      setReturnAddressForm({
        recipient_name: prefill.recipient_name || '',
        contact_number: prefill.contact_number || '',
        country: prefill.country || 'Philippines',
        province: prefill.province || '',
        city: prefill.city || '',
        barangay: prefill.barangay || '',
        street: prefill.street || '',
        zip_code: prefill.zip_code || '',
        notes: prefill.notes || ''
      });
    }
    setShowReturnAddressSection(true);
  };

  const handleReturnAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReturnAddressForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitReturnAddress = async () => {
    const idToUse = effectiveRefundId || refundId || loaderRefundId;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    try {
      setAddrSubmitting(true);
      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/set_return_address/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify(returnAddressForm)
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) {
          updatedRefund = normalizeRefund(data.refund);
        } else if (data && (data.id || data.refund_id || data.refund)) {
          updatedRefund = normalizeRefund(data.refund || data);
        }

        if (updatedRefund) {
          setRefund(updatedRefund);
        } else {
          await fetchLatestRefund();
        }

        toast({ title: 'Success', description: 'Return address saved and buyer notified' });
        setShowReturnAddressSection(false);

        // Navigate to To Process tab after saving
        try {
          const targetUrl = `/seller/seller-return-refund-cancel?shop_id=${encodeURIComponent(String(shopId || ''))}&tab=to-process`;
          navigate(targetUrl, { state: { message: 'Return address provided' } });
          setTimeout(() => {
            try {
              if (!window.location.pathname.includes('/seller/seller-return-refund-cancel')) {
                window.location.href = targetUrl;
              }
            } catch (err) {
              console.warn('Fallback navigation failed', err);
            }
          }, 300);

        } catch (e) {
          // ignore navigation errors
        }
      } else {
        const text = await response.text().catch(() => 'Failed to save return address');
        throw new Error(text || 'Failed to save return address');
      }
    } catch (error) {
      toast({ title: 'Error', description: (error instanceof Error) ? error.message : 'Failed to save return address', variant: 'destructive' });
    } finally {
      setAddrSubmitting(false);
    }
  };

  useEffect(() => setRefund(initialRefund), [initialRefund]);

  const fetchLatestRefund = useCallback(async () => {
    if (!refundId) return;
    try {
      const endpoint = apiUrlFor(`/return-refund/${refundId}/get_seller_refund_details/?shop_id=${encodeURIComponent(String(shopId))}`);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
      });

      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data) {
        setRefund(normalizeRefund(data));
      }
    } catch (e) {
      console.error('Failed to fetch latest refund', e);
    }
  }, [refund?.refund || refund?.id, shopId, user.id]);



  // Proof uploader handlers
  useEffect(() => {
    // generate previews for selected files
    const urls = selectedProofFiles.map((f) => URL.createObjectURL(f));
    setProofPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [selectedProofFiles]);

  const handleSelectedProofFiles = (files: File[]) => {
    setSelectedProofFiles(files);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedProofFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadProofs = async (filesParam?: File[]) => {
    const filesToUse = filesParam && filesParam.length > 0 ? filesParam : selectedProofFiles;

    const idToUse = effectiveRefundId || refundId || loaderRefundId;
    const sanitizedId = (typeof idToUse === 'string' && (idToUse === 'undefined' || idToUse === 'null')) ? null : idToUse;
    if (!sanitizedId) {
      toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
      return false;
    }

    if (!filesToUse || filesToUse.length === 0) {
      toast({ title: 'Error', description: 'No files selected', variant: 'destructive' });
      return;
    }

    try {
      setProofUploading(true);
      const fd = new FormData();
      filesToUse.forEach((f) => fd.append('file_data', f));
      if (proofNotes) fd.append('notes', proofNotes);

      const resp = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(sanitizedId))}/add_proof/`), {
        method: 'POST',
        headers: {
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: fd,
      });

      if (resp.ok || resp.status === 201) {
        const data = await resp.json().catch(() => null);
        toast({ title: 'Success', description: 'Proof uploaded' });
        setSelectedProofFiles([]);
        setProofNotes('');
        if (data && data.refund) {
          const updated = normalizeRefund(data.refund);
          setRefund(updated);
        } else {
          await fetchLatestRefund();
        }
        return true;
      } else {
        const err = await resp.text().catch(() => 'Failed to upload proof');
        toast({ title: 'Error', description: err, variant: 'destructive' });
        return false;
      }
    } catch (e) {
      console.error('Upload proof failed', e);
      toast({ title: 'Error', description: 'Failed to upload proof', variant: 'destructive' });
      return false;
    } finally {
      setProofUploading(false);
    }
  };

  const refundId = (refund as any)?.refund_id || refund?.refund || refund?.id;
  const effectiveRefundId = (refund as any)?.refund_id || refund?.refund || refund?.id || loaderRefundId;
  const statusRaw = refund?.status ?? 'pending';
  const status = String(statusRaw).toLowerCase();
  const paymentStatusLower = String(refund?.refund_payment_status || '').toLowerCase();
  // Treat an approved refund with completed payment as "completed" for UI/tab purposes
  const effectiveStatus = (status === 'approved' && paymentStatusLower === 'completed') ? 'completed' : status;

  const derivedStatusForDisplay = ((refund?.refund_category === 'return_item' || (refund as any)?.refund_type === 'return') && refund?.return_request?.status)
    ? String(refund.return_request.status).toLowerCase()
    : effectiveStatus;

  const statusConfig = STATUS_CONFIG[derivedStatusForDisplay] || STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const rrStatusTop = String(refund.return_request?.status || '').toLowerCase();
const isReturnAwaitingShipmentTop = rrStatusTop === '' ? Boolean(refund?.buyer_notified_at) : ['pending','shipped'].includes(rrStatusTop);
const isWaitingDerived = (status === 'waiting' || (status === 'approved' && (refund?.refund_category === 'return_item' || (refund as any)?.refund_type === 'return') && isReturnAwaitingShipmentTop));

  const isProcessingCompactView = status === 'to_process' || (status === 'approved' && refund?.refund_payment_status === 'processing');

  const backTo = shopId ? `/seller/seller-return-refund-cancel?shop_id=${encodeURIComponent(String(shopId))}` : '/seller/seller-return-refund-cancel';

  // Ensure we fetch fresh refund details when component mounts or when an id becomes available
  useEffect(() => {
    const id = effectiveRefundId || refund?.refund || refund?.id || loaderRefundId;
    if (id) {
      fetchLatestRefund();
    }
  }, [effectiveRefundId, refund?.refund, refund?.id, loaderRefundId]);

  const handleApprove = async () => {
    // For return-type refunds: open the return address modal as the second step of approval
    if (refund?.refund_type === 'return') {
      openReturnAddressDialog(refund.return_address);
      return;
    }

    const idToUse = effectiveRefundId || refundId || loaderRefundId;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/seller_respond_to_refund/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'approve',
          notes: 'Approved by seller',
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) {
          updatedRefund = normalizeRefund(data.refund);
        } else if (data && (data.id || data.refund_id || data.refund)) {
          updatedRefund = normalizeRefund(data.refund || data);
        }

        if (updatedRefund) {
          // Set updated refund in state
          setRefund(updatedRefund);

          // Decide whether to show the Processing UI immediately based on rules:
          // Ready to Process Payment
          // - Keep items: refund_type === 'keep' && refund_payment_status === 'processing'
          // - Return items after approval: refund_type === 'return' && refund_payment_status === 'processing' && return_request.status === 'approved'
          const rtype = String(updatedRefund.refund_type || '').toLowerCase();
          const paymentStatus = String(updatedRefund.refund_payment_status || '').toLowerCase();
          const rrStatus = String(updatedRefund.return_request?.status || '').toLowerCase();

          const readyToProcess = (
            (rtype === 'keep' && (paymentStatus === 'processing' || String(updatedRefund.status).toLowerCase() === 'approved')) ||
            (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
          );

          if (readyToProcess) {
            // Show inline Processing UI after approval, but do not auto-open the confirmation modal —
            // the seller can interact with the Processing UI directly to confirm/complete the refund.
            setShowProcessingNow(true);
            // For keep-type refunds which are approved, proactively set the payment status to 'processing'
            if (rtype === 'keep' && String(updatedRefund.refund_payment_status || '').toLowerCase() !== 'processing') {
              // Fire and forget - handleSetPaymentStatus will update refund state when done
              handleSetPaymentStatus('processing');
            }
            // We intentionally do NOT call setAutoOpenProcessing(true) here to avoid opening the confirmation dialog immediately.
          } else {
            // Keep seller on the current details view (Approved/Waiting) per the tab rules
            setShowProcessingNow(false);
          }
        } else {
          await fetchLatestRefund();
        }

        toast({
          title: 'Success',
          description: 'Refund request approved successfully',
        });
      } else {
        const text = await response.text().catch(() => 'Failed to approve refund');
        throw new Error(text || 'Failed to approve refund');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve refund',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(apiUrlFor(`/return-refund/${refundId}/seller_respond_to_refund/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reject',
          notes: rejectReason,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) {
          updatedRefund = normalizeRefund(data.refund);
        } else if (data && (data.id || data.refund_id || data.refund)) {
          updatedRefund = normalizeRefund(data.refund || data);
        }

        if (updatedRefund) {
          setRefund(updatedRefund);
          setShowRejectModal(false);
          setRejectReason('');
        } else {
          setShowRejectModal(false);
          setRejectReason('');
          await fetchLatestRefund();
        }

        toast({
          title: 'Success',
          description: 'Refund request rejected',
        });

        // After rejection, navigate to Completed tab
        try {
          const targetUrl = `/seller/seller-return-refund-cancel?shop_id=${encodeURIComponent(String(shopId || ''))}&tab=completed`;
          navigate(targetUrl, { state: { message: 'Refund rejected' } });
          setTimeout(() => {
            try {
              if (!window.location.pathname.includes('/seller/seller-return-refund-cancel')) {
                window.location.href = targetUrl;
              }
            } catch (err) {
              console.warn('Fallback navigation failed', err);
            }
          }, 300);
          return;
        } catch (e) {
          // ignore navigation errors
        }
      } else {
        throw new Error('Failed to reject refund');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject refund',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [autoOpenProcessing, setAutoOpenProcessing] = useState(false);
  // When true, show the Processing UI inline immediately after approval so seller can process the refund
  const [showProcessingNow, setShowProcessingNow] = useState(false);
  // Track whether we've already auto-triggered processing for keep-type refunds
  const [autoTriggeredProcessing, setAutoTriggeredProcessing] = useState(false);

  // Determine if we're in a processing state (controls whether proofs UI is shown and whether proof is required)
  const _paymentStatus = String(refund?.refund_payment_status || '').toLowerCase();
  const _statusLower = String(refund?.status || '').toLowerCase();
  const _rtypeLower = String(refund?.refund_type || '').toLowerCase();
  const _rrStatus = String(refund?.return_request?.status || '').toLowerCase();
  const _payIsPendingOrEmpty = _paymentStatus === '' || _paymentStatus === 'pending' || _paymentStatus === 'none';
  const isProcessingState = (
    showProcessingNow ||
    _paymentStatus === 'processing' ||
    _statusLower === 'to_process' ||
    // Keep items: processing OR approved but payment not yet set (pending/empty)
    (_rtypeLower === 'keep' && (_paymentStatus === 'processing' || (_statusLower === 'approved' && _payIsPendingOrEmpty))) ||
    // Return items: need processing and return_request must be approved
    (_rtypeLower === 'return' && _paymentStatus === 'processing' && _rrStatus === 'approved')
  );

  // Show confirmation dialog for processing refund (moved from the Processing UI to Actions panel)
  const [showProcessConfirmation, setShowProcessConfirmation] = useState(false);

  useEffect(() => {
    // Open the confirmation dialog only when both autoOpenProcessing is requested AND the inline Processing UI is active.
    if (autoOpenProcessing) {
      if (showProcessingNow) {
        setShowProcessConfirmation(true);
        // Close the inline UI when showing the modal to avoid duplication
        setShowProcessingNow(false);
      }
      // Reset the auto flag regardless so it doesn't retrigger unexpectedly
      setAutoOpenProcessing(false);
    }
  }, [autoOpenProcessing, showProcessingNow]);

  // Auto-trigger processing for keep-item refunds that are already approved.
  useEffect(() => {
    if (!refund) return;
    const rtype = String(refund.refund_type || '').toLowerCase();
    const stat = String(refund.status || '').toLowerCase();
    const pay = String(refund.refund_payment_status || '').toLowerCase();

    // Only auto-trigger processing for keep refunds when payment status is explicitly pending or empty
    // This avoids overwriting an explicit 'completed' status set by the seller's manual action.
    const payIsPendingOrEmpty = pay === '' || pay === 'pending' || pay === 'none';

    if (!autoTriggeredProcessing && rtype === 'keep' && stat === 'approved' && payIsPendingOrEmpty) {
      // Show inline processing UI and request backend to mark as processing
      setAutoTriggeredProcessing(true);
      setShowProcessingNow(true);
      // Fire and forget - handleSetPaymentStatus will update refund state when done
      handleSetPaymentStatus('processing');
    }
  }, [refund, autoTriggeredProcessing]);

  const handleMarkAsReceived = async () => {
    try {
      setActionLoading(true);

      const idToUse = effectiveRefundId;
      if (!idToUse) {
        toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
        return;
      }

      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/update_return_status/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark_received', notes: '' }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.refund) {
          const updatedRefund = normalizeRefund(data.refund);
          setRefund(updatedRefund);
        } else {  
          await fetchLatestRefund();
        }

        toast({
          title: 'Success',
          description: 'Item marked as received',
        });

        // After marking received, open the inspection UI component (inline) by focusing UI on inspection
        // We keep the button in actions as well; the status UI below will change to the inspection prompt.
      } else {
        throw new Error('Failed to mark as received');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyItem = async (result: 'approved' | 'rejected', notes?: string) => {
    try {
      setActionLoading(true);

      const idToUse = effectiveRefundId;
      if (!idToUse) {
        toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
        return;
      }

      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/verify_item/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify({
          verification_result: result,
          verification_notes: notes || '',
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && data.refund) {
          const updatedRefund = normalizeRefund(data.refund);
          setRefund(updatedRefund);

          if (String(updatedRefund.refund_payment_status).toLowerCase() === 'processing' || String(updatedRefund.status).toLowerCase() === 'to_process') {
            // Open the inline Processing UI without auto-opening the confirmation modal when approval comes from inspection.
            setShowProcessingNow(true);
            // Ensure any previously-requested auto-open is cleared so the modal does not appear unexpectedly.
            setAutoOpenProcessing(false);
          }

          toast({
            title: 'Success',
            description: `Item verification ${result}`,
          });
        } else {
          throw new Error('Failed to verify item');
        }
      } else {
        throw new Error('Failed to verify item');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify item',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark as inspected handler (used by the Received UI and action button)
  const handleMarkInspected = async () => {
    try {
      setActionLoading(true);
      const idToUse = effectiveRefundId;
      if (!idToUse) {
        toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
        return;
      }

      const resp = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/update_return_status/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'mark_inspected' }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (data && data.refund) {
          const updated = normalizeRefund(data.refund);
          setRefund(updated);
          if (String(updated.status).toLowerCase() === 'to_process' || String(updated.refund_payment_status).toLowerCase() === 'processing') {
            setAutoOpenProcessing(true);
          }
        } else {
          await fetchLatestRefund();
        }

        toast({ title: 'Success', description: 'Item marked as inspected' });
      } else {
        throw new Error('Failed to mark as inspected');
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to mark inspected', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async (): Promise<boolean> => {
    try {
      // Prevent the auto-processing trigger from racing with a manual completed action
      try {
        const rtype = String(refund?.refund_type || '').toLowerCase();
        const stat = String(refund?.status || '').toLowerCase();
        if (rtype === 'keep' && stat === 'approved') {
          setAutoTriggeredProcessing(true);
          console.log('Manual completion requested, disabling auto-trigger for processing');
        }
      } catch (_) {}

      setActionLoading(true);
      console.log('handleProcessRefund start', { selectedProofFiles: (selectedProofFiles || []).length, serverProofs: (refund as any)?.proofs?.length || 0 });

      // Use sanitized refund id
      const idToUse = effectiveRefundId || refundId || loaderRefundId;
      const sanitizedId = (typeof idToUse === 'string' && (idToUse === 'undefined' || idToUse === 'null')) ? null : idToUse;
      if (!sanitizedId) {
        toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
        setActionLoading(false);
        return false;
      }

      // If seller selected files, send them together with the process request so upload+process occur together
      if (selectedProofFiles && selectedProofFiles.length > 0) {
        try {
          const fd = new FormData();
          selectedProofFiles.forEach((f) => fd.append('file_data', f));
          if (proofNotes) fd.append('notes', proofNotes);
          // Tell backend we want to set to completed (confirm finalizes the refund)
          fd.append('set_status', 'completed');
          const finalMethod = refund.final_refund_method || refund.preferred_refund_method;
          if (finalMethod) fd.append('final_refund_method', finalMethod);

          const resp = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(sanitizedId))}/process_refund/`), {
            method: 'POST',
            headers: {
              'X-User-Id': String(user.id),
              'X-Shop-Id': String(shopId),
            },
            credentials: 'include',
            body: fd,
          });

          if (resp.ok || resp.status === 201) {
            const data = await resp.json().catch(() => null);
            toast({ title: 'Success', description: 'Proof uploaded and refund completed' });
            setSelectedProofFiles([]);
            setProofNotes('');
            if (data && data.refund) {
              const updatedRefund = normalizeRefund(data.refund);
              setRefund(updatedRefund);
              if (String(updatedRefund.refund_payment_status || '').toLowerCase() === 'completed') {
                // Ensure Processing UI is closed when payment is completed
                setShowProcessingNow(false);
                setAutoOpenProcessing(false);
                setAutoTriggeredProcessing(false);
              }
            } else {
              await fetchLatestRefund();
            }
            return true;
          } else {
            // Try to extract JSON error first
            let errMsg = 'Failed to upload proofs and process refund';
            try {
              const j = await resp.json();
              errMsg = j.error || j.detail || JSON.stringify(j);
            } catch (_) {
              const txt = await resp.text().catch(() => null);
              if (txt) errMsg = txt;
            }
            console.error('Process refund (file) failed', resp.status, errMsg);
            toast({ title: 'Error', description: errMsg, variant: 'destructive' });
            return false;
          }
        } catch (e) {
          console.error('Failed to upload and process refund', e);
          toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to upload or process refund', variant: 'destructive' });
          setActionLoading(false);
          return false;
        }
      } else {
        const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(sanitizedId))}/process_refund/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(user.id),
            'X-Shop-Id': String(shopId),
          },
          credentials: 'include',
          body: JSON.stringify({
            final_refund_method: refund.final_refund_method || refund.preferred_refund_method,
            set_status: 'completed'
          }),
        });

        if (!response.ok) {
          // Try to extract structured error
          let errMsg = 'Failed to process refund';
          try {
            const j = await response.json();
            errMsg = j.error || j.detail || JSON.stringify(j);
          } catch (_) {
            const txt = await response.text().catch(() => null);
            if (txt) errMsg = txt;
          }
          console.error('Process refund (no-file) failed', response.status, errMsg);
          toast({ title: 'Error', description: errMsg, variant: 'destructive' });
          return false;
        }

        const data = await response.json().catch(() => null);
        if (data && data.refund) {
          const updatedRefund = normalizeRefund(data.refund);
          setRefund(updatedRefund);
          if (String(updatedRefund.refund_payment_status || '').toLowerCase() === 'completed') {
            setShowProcessingNow(false);
            setAutoOpenProcessing(false);
            setAutoTriggeredProcessing(false);
          }
        } else {
          await fetchLatestRefund();
        }

        // Show success toast for the non-file process flow (completed)
        toast({ title: 'Success', description: 'Refund completed successfully' });
        return true;
      }


    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process refund',
        variant: 'destructive',
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPaymentStatus = async (setStatus: 'processing' | 'completed' | 'failed') => {
    if (!refundId) return;

    // Prevent completing if there are no proofs
    if (setStatus === 'completed' && !buttonEnabled) {
      toast({ title: 'Action blocked', description: 'Please upload at least one proof before marking this refund as completed.', variant: 'destructive' });
      return;
    }

    try {
      setActionLoading(true);

      const payload: any = { set_status: setStatus };
      // Include final refund method when starting processing or completing
      if (setStatus === 'processing' || setStatus === 'completed') {
        payload.final_refund_method = refund.final_refund_method || refund.preferred_refund_method || refund.buyer_preferred_refund_method || null;
      }

      const response = await fetch(apiUrlFor(`/return-refund/${refundId}/process_refund/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) {
          updatedRefund = normalizeRefund(data.refund);
        }

        if (updatedRefund) {
          setRefund(updatedRefund);
        } else {
          await fetchLatestRefund();
        }

        toast({
          title: 'Success',
          description: `Payment status updated: ${setStatus}`,
        });
      } else {
        const text = await response.text().catch(() => 'Failed to update payment status');
        throw new Error(text || 'Failed to update payment status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update payment status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotifyBuyer = async () => {
    const id = effectiveRefundId;
    if (!id) {
      console.error('notify_buyer missing ids', { refundId, loaderRefundId, refund });
      toast({ title: 'Error', description: 'Missing refund identifier (cannot notify buyer)', variant: 'destructive' });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(apiUrlFor(`/return-refund/${id}/notify_buyer/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id),
          'X-Shop-Id': String(shopId),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        let updatedRefund = null;
        if (data && data.refund) {
          updatedRefund = normalizeRefund(data.refund);
        }

        if (updatedRefund) {
          setRefund(updatedRefund);
        } else {
          await fetchLatestRefund();
          setRefund((prev) => prev ? { ...prev, buyer_notified_at: prev.buyer_notified_at || new Date().toISOString() } : prev);
        }

        toast({
          title: 'Success',
          description: 'Buyer notified successfully',
        });
      } else {
        const text = await response.text().catch(() => 'Failed to notify buyer');
        throw new Error(text || 'Failed to notify buyer');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to notify buyer',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };



  const renderStatusActions = useMemo(() => {
    const isPending = effectiveStatus === 'pending' || effectiveStatus.includes('pending');
    const isApproved = effectiveStatus === 'approved' || effectiveStatus.includes('approved');
    const isApprovedKeep = isApproved && (refund?.refund_category === 'keep_item' || (refund as any)?.refund_type === 'keep');
    const rrStatusRaw = String(refund.return_request?.status || '').toLowerCase();
    const buyerNotified = Boolean(refund?.buyer_notified_at);
    const isReturnAwaitingShipment = rrStatusRaw === '' ? buyerNotified : ['pending','shipped'].includes(rrStatusRaw);
    const isWaiting = (effectiveStatus === 'waiting' || effectiveStatus.includes('waiting')) || (effectiveStatus === 'approved' && (refund?.refund_category === 'return_item' || (refund as any)?.refund_type === 'return') && isReturnAwaitingShipment);
    
    const isToVerify = effectiveStatus === 'to_verify' || effectiveStatus === 'to-verify' || effectiveStatus.includes('to_verify') || effectiveStatus.includes('to-verify') || refund?.return_request?.status === 'inspected';
    const isToProcess = effectiveStatus === 'to_process' || effectiveStatus.includes('to_process') || effectiveStatus.includes('to-process');
    const isDispute = effectiveStatus === 'dispute' || effectiveStatus.includes('dispute');

    // Determine if the refund is ready to process (used to show action in the Actions panel)
    const rtype = String(refund.refund_type || '').toLowerCase();
    const paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
    const rrStatus = String(refund.return_request?.status || '').toLowerCase();
    const readyToProcess = (
      String(refund.status || '').toLowerCase() === 'to_process' ||
      (rtype === 'keep' && paymentStatus === 'processing') ||
      (rtype === 'return' && paymentStatus === 'processing' && rrStatus === 'approved')
    );

    return (
      <div className="space-y-3">
        {isPending && (
          <>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {actionLoading ? 'Approving...' : 'Approve Request'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCounterOffer(true)}
              className="w-full"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Make Offer
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(true)}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Request
            </Button>
          </>
        )}

        {isApproved && (
          // For return-type refunds: allow providing an address when missing; otherwise show a small inline note
          (refund?.refund_type === 'return') ? (
            refund.return_address ? (
              <div className="text-sm text-gray-600">Return address provided • {formatDate(refund.return_address?.created_at)}</div>
            ) : (
              <Button
                onClick={() => openReturnAddressDialog(refund.return_address)}
                disabled={actionLoading || !effectiveRefundId}
                title={!effectiveRefundId ? 'Missing refund identifier' : undefined}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {actionLoading ? 'Processing...' : 'Provide Return Address'}
              </Button>
            )
          ) : (
            // Non-return refunds: indicate buyer notification if present
            refund.buyer_notified_at ? (
              <Button
                disabled
                className="w-full bg-gray-100 text-gray-600"
                size="sm"
                title={`Buyer notified at ${formatDate(refund.buyer_notified_at)}`}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Buyer Notified
              </Button>
            ) : null
          )
        )}



        {isProcessingCompactView && refund?.refund_payment_status === 'processing' && (
          <div className="space-y-2">
            <Button
              onClick={handleProcessRefund}
              disabled={actionLoading || !buttonEnabled}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {actionLoading ? 'Updating...' : 'Mark Completed'}
            </Button>

            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <div>Uploaded: {((refund as any)?.proofs ? (refund as any).proofs.length : 0)}</div>
              <div>Pending: {(selectedProofFiles || []).length}</div>
            </div>

            {!buttonEnabled && (
              <p className="mt-1 text-xs text-red-600">Please upload at least one proof before marking this refund as completed.</p>
            )}

            <Button
              variant="outline"
              onClick={() => handleSetPaymentStatus('failed')}
              disabled={actionLoading}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Failed
            </Button>
          </div>
        )}

        {readyToProcess && !isProcessingCompactView && (
          <div>
            <Button
              onClick={() => { if (isProcessingState && !buttonEnabled) return; setShowProcessConfirmation(true); }}
              disabled={actionLoading || (isProcessingState && !buttonEnabled)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {actionLoading ? 'Processing...' : 'Complete Refund'}
            </Button>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div>Uploaded: {((refund as any)?.proofs ? (refund as any).proofs.length : 0)}</div>
              <div>Pending: {(selectedProofFiles || []).length}</div>
            </div>

            {isProcessingState && !buttonEnabled ? (
              <p className="mt-2 text-xs text-red-600">Please upload at least one proof before completing the refund.</p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Files will be uploaded when you click <strong>Complete Refund</strong>.</p>
            )}
          </div>
        )}

        {isWaiting && (
          <Button
            onClick={handleMarkAsReceived}
            disabled={actionLoading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <PackageCheck className="h-4 w-4 mr-2" />
            {actionLoading ? 'Updating...' : 'Mark as Received'}
          </Button>
        )}

        {refund?.return_request?.status === 'received' && (
          <Button
            onClick={async () => {
              try {
                setActionLoading(true);
                const idToUse = effectiveRefundId;
                if (!idToUse) {
                  toast({ title: 'Error', description: 'Refund ID missing', variant: 'destructive' });
                  return;
                }

                const resp = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/update_return_status/`), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': String(user.id),
                    'X-Shop-Id': String(shopId),
                  },
                  credentials: 'include',
                  body: JSON.stringify({ action: 'mark_inspected' }),
                });

                if (resp.ok) {
                  const data = await resp.json().catch(() => null);
                  if (data && data.refund) {
                    const updated = normalizeRefund(data.refund);
                    setRefund(updated);
                    if (String(updated.status).toLowerCase() === 'to_process' || String(updated.refund_payment_status).toLowerCase() === 'processing') {
                      setAutoOpenProcessing(true);
                    }
                  } else {
                    await fetchLatestRefund();
                  }

                  toast({ title: 'Success', description: 'Item marked as inspected' });
                } else {
                  throw new Error('Failed to mark as inspected');
                }
              } catch (err) {
                toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to mark inspected', variant: 'destructive' });
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            {actionLoading ? 'Updating...' : 'Mark as Inspected'}
          </Button>
        )}

        {isToVerify && (
          <div className="space-y-2">
            <Button
              onClick={() => handleVerifyItem('approved', 'Item verified')}
              disabled={actionLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {actionLoading ? 'Verifying...' : 'Accept Return'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVerifyItem('rejected', 'Item condition not acceptable')}
              disabled={actionLoading}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Return
            </Button>
          </div>
        )}





        {(effectiveStatus === 'completed' || effectiveStatus === 'rejected' || effectiveStatus === 'cancelled') && (
          <Button
            variant="outline"
            onClick={() => navigate(backTo)}
            className="w-full"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        )}
      </div>
    );
  }, [effectiveStatus, refund, actionLoading, refundId, shopId, buttonEnabled, isProcessingState]);

  const renderStatusUI = useMemo(() => {
    if (!refund) return null;

    // If the return_request shows 'received', show a specific Received UI prompting inspection
    if (refund.return_request?.status === 'received') return <ReceivedStatusUI refund={refund} />;

    // If payment completed for an approved refund, show Completed UI immediately (covers both keep and return)
    const _paymentStatus = String(refund.refund_payment_status || '').toLowerCase();
    const _status = String(refund.status || '').toLowerCase();
    if (_status === 'approved' && _paymentStatus === 'completed') return <CompletedStatusUI refund={refund} />;

    // Decide if the refund is already ready to process (ensures correct UI after refresh)
    const _rtype = String(refund.refund_type || '').toLowerCase();
    const _rrStatus = String(refund.return_request?.status || '').toLowerCase();
    const readyToProcess = (
      // Any refund with payment_status 'processing' is ready to process (both keep and return),
      // or an explicit to_process status
      _paymentStatus === 'processing' ||
      String(refund.status || '').toLowerCase() === 'to_process'
    );

    if (showProcessingNow || readyToProcess) {
      return <ProcessingRefundUI refund={refund} onProcess={handleProcessRefund} onSetPaymentStatus={handleSetPaymentStatus} autoOpenDetails={autoOpenProcessing} />;
    }

    if (isWaitingDerived) return <WaitingStatusUI refund={refund} />;

    if (refund.return_request?.status === 'inspected') return <ToVerifyStatusUI refund={refund} />;

    switch (effectiveStatus) {
      case 'pending': return <PendingStatusUI />;
      case 'negotiation': return <NegotiationStatusUI refund={refund} />;
      case 'approved': return <ApprovedStatusUI refund={refund} />;
      case 'waiting': return <WaitingStatusUI refund={refund} />;
      case 'to_verify': return <ToVerifyStatusUI refund={refund} />;
      case 'to_process': return <ProcessingRefundUI refund={refund} onProcess={handleProcessRefund} onSetPaymentStatus={handleSetPaymentStatus} autoOpenDetails={autoOpenProcessing} />;
      case 'dispute': return <DisputeStatusUI refund={refund} />;
      case 'completed': return <CompletedStatusUI refund={refund} />;
      case 'rejected': return <SellerRejectedStatusUI refund={refund} />;
      case 'cancelled': return null;
      default: return null;
    }
  }, [effectiveStatus, refund, isWaitingDerived]);

  return (
    <ClientUserProvider user={user ?? null}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <HeaderSection 
          refund={refund} 
          statusConfig={statusConfig} 
          StatusIcon={StatusIcon} 
          navigate={navigate} 
          backTo={backTo} 
          shopId={shopId} 
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status-specific UI */}
            {renderStatusUI}

            {/* Request Details */}
            <RequestDetailsSection refund={refund} />

            {/* Proofs Upload (show while processing/to_process) OR read-only proofs for completed */}
            {isProcessingState ? (
              <ProofsUploadSection
                refund={refund}
                selectedProofFiles={selectedProofFiles}
                proofPreviews={proofPreviews}
                proofNotes={proofNotes}
                proofUploading={proofUploading}
                hasProofs={hasProofs}
                existingProofCount={existingProofCount}
                maxProofsAllowed={maxProofsAllowed}
                remainingProofSlots={remainingProofSlots}
                buttonEnabled={buttonEnabled}
                handleSelectedProofFiles={handleSelectedProofFiles}
                setProofNotes={setProofNotes}
                removeSelectedFile={removeSelectedFile}
                toast={toast}
              />
            ) : (effectiveStatus === 'completed' ? (
              <ProofsDisplaySection refund={refund} />
            ) : null)} 

            {/* Collapsible Sections */}
            {!isProcessingCompactView && (
              <>
                <OrderItemsSection refund={refund} />
                <CustomerDetailsSection refund={refund} />
                <EvidenceSection refund={refund} />
              </>
            )}
          </div>

          {/* Right Column - Actions & Summary */}
          <div className="space-y-4">
            {/* Actions Card */}
            <ActionsSection 
              renderStatusActions={renderStatusActions} 
              refund={refund} 
              navigate={navigate} 
            />

            {/* Summary Card */}
            <SummarySection refund={refund} />

            {/* Timeline Card */}
            <TimelineSection statusConfig={statusConfig} />
          </div>
        </div>

        {/* Reject Modal */}
        <RejectModal 
          showRejectModal={showRejectModal}
          setShowRejectModal={setShowRejectModal}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          isProcessing={isProcessing}
          handleRejectSubmit={handleRejectSubmit}
        />

        {/* Counter Offer Modal */}
        <CounterOfferModal
          show={showCounterOffer}
          setShow={setShowCounterOffer}
          refund={refund}
          userId={user.id}
          shopId={shopId}
          setRefund={setRefund}
          fetchLatestRefund={fetchLatestRefund}
        />

        {/* Inline Return Address Section (shown as step 2 when seller clicks Approve on return refunds) */}
        <ReturnAddressSection
          showReturnAddressSection={showReturnAddressSection}
          setShowReturnAddressSection={setShowReturnAddressSection}
          refund={refund}
          returnAddressForm={returnAddressForm}
          handleReturnAddressChange={handleReturnAddressChange}
          addrSubmitting={addrSubmitting}
          handleSubmitReturnAddress={handleSubmitReturnAddress}
        />

        {/* Complete Refund Confirmation Modal */}
        <Dialog open={showProcessConfirmation} onOpenChange={setShowProcessConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Complete Refund
              </DialogTitle>
              <DialogDescription>
                Confirm and complete this refund.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {isProcessingState && !buttonEnabled ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Proof required</AlertTitle>
                  <AlertDescription>Please upload at least one proof before completing the refund.</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessConfirmation(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Guard: require proof in processing state
                  if (isProcessingState && !buttonEnabled) return;
                  const ok = await handleProcessRefund();
                  if (ok) setShowProcessConfirmation(false);
                }}
                disabled={actionLoading || (isProcessingState && !buttonEnabled)}
              >
                {actionLoading ? 'Processing...' : 'Confirm and Complete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientUserProvider>
  );
}