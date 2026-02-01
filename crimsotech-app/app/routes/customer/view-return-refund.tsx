"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { Route } from './+types/view-return-refund';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import AxiosInstance from '~/components/axios/Axios';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Shield,
  RotateCcw,
  Truck,
  PackageCheck,
  CheckSquare,
  FileText,
  XCircle,
  MessageCircle,
  ShoppingBag,
  AlertTriangle,
  Eye,
  Store,
  Package,
  MoreVertical,
  Printer,
  MessageSquare,
  Mail,
  RefreshCw,
  Upload,
  ExternalLink,
  Info,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Wallet,
  Ban,
  Hash,
  CreditCard,
  Building,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '~/components/ui/dropdown-menu';
import { Label } from '~/components/ui/label';

// Local helper to sanitize notes (mirrors seller view sanitizer)
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
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/hooks/use-toast';
import type { User as UserType } from '~/contexts/user-role';
import { Input } from '~/components/ui/input';

// Top-level dialog components to avoid remounting on parent renders (prevents input caret loss)
function AcceptPreviewDialogComponent({ open, onOpenChange, method, preview, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; method: string | null; preview: any; onConfirm: () => Promise<void> }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Accept</DialogTitle>
          <DialogDescription>Review your account details for refund before confirming.</DialogDescription>
        </DialogHeader>

        <div className="mt-3">
          {preview ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Method</div>
              <div className="font-medium">{method}</div>
              <div className="mt-2 text-sm text-gray-500">Account details</div>
              <div className="p-3 bg-gray-50 rounded">
                {method === 'wallet' && (
                  <div>
                    <div className="font-medium">{preview.provider || preview.wallet_provider || '—'}</div>
                    <div className="text-sm">{preview.account_number || preview.wallet_id || '—'}</div>
                    <div className="text-sm text-gray-600">{preview.account_name || preview.owner_name || ''}</div>
                  </div>
                )}

                {method === 'bank' && (
                  <div>
                    <div className="font-medium">{preview.bank_name || preview.name || '—'}</div>
                    <div className="text-sm">{preview.account_number || '—'}</div>
                    <div className="text-sm text-gray-600">{preview.account_name || ''}</div>
                  </div>
                )}

                {method === 'remittance' && (
                  <div>
                    <div className="font-medium">{preview.provider || preview.service || '—'}</div>
                    <div className="text-sm">{preview.reference || preview.account || '—'}</div>
                    <div className="text-sm text-gray-600">{preview.receiver_name || `${preview.first_name || ''} ${preview.last_name || ''}`}</div>
                  </div>
                )}

                {!preview && (
                  <div className="text-sm text-gray-600">No preview available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No account details available to preview.</div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto bg-green-600" onClick={onConfirm}>Confirm & Accept</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAccountDialogComponent({ open, onOpenChange, preselectedMethod, accountForm, setAccountForm, addingAccount, onSubmit }: { open: boolean; onOpenChange: (v:boolean) => void; preselectedMethod: string | null; accountForm: any; setAccountForm: (f:any) => void; addingAccount: boolean; onSubmit: () => Promise<void> }) {
  const { toast: toastLocal } = useToast();
  const [methodLocal, setMethodLocal] = React.useState<string | null>(preselectedMethod || null);

  React.useEffect(() => {
    setMethodLocal(preselectedMethod || null);
    setAccountForm({});
  }, [preselectedMethod]);

  const validate = (method: string | null, form: any) => {
    const missing: string[] = [];
    if (!method) { missing.push('method'); return { ok: false, missing }; }
    if (method === 'wallet') {
      if (!form.provider || !String(form.provider).trim()) missing.push('Provider');
      if (!form.account_number || !String(form.account_number).trim()) missing.push('Wallet ID / Account Number');
    } else if (method === 'bank') {
      if (!form.bank_name || !String(form.bank_name).trim()) missing.push('Bank Name');
      if (!form.account_number || !String(form.account_number).trim()) missing.push('Account Number');
      if (!form.account_name || !String(form.account_name).trim()) missing.push('Account Name');
    } else if (method === 'remittance') {
      if (!form.provider || !String(form.provider).trim()) missing.push('Service Provider');
      if (!form.first_name || !String(form.first_name).trim()) missing.push('Receiver First Name');
      if (!form.last_name || !String(form.last_name).trim()) missing.push('Receiver Last Name');
      if (!form.reference && !form.account_number) missing.push('Reference / Account');
      if (!form.contact_number || !String(form.contact_number).trim()) missing.push('Contact Number');
    }
    return { ok: missing.length === 0, missing };
  };

  const validated = validate(methodLocal, accountForm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Account for Refund</DialogTitle>
          <DialogDescription>Please provide account details so seller can process refunds to this account. Fields marked * are required.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          <div>
            <Label className="text-sm">Refund Method</Label>
            <select value={methodLocal || ''} onChange={(e)=>{ if(!preselectedMethod){ setMethodLocal(e.target.value || null); setAccountForm({}); } }} className="mt-1 block w-full rounded-md border p-2" disabled={Boolean(preselectedMethod)}>
              <option value="">Select a method</option>
              <option value="wallet">E-Wallet</option>
              <option value="bank">Bank Transfer</option>
              <option value="remittance">Remittance</option>
            </select>
            {methodLocal && (<div className="text-xs text-gray-500 mt-1">Method preselected from seller's offer: <strong>{methodLocal}</strong></div>)}
          </div>

          {methodLocal === 'wallet' && (
            <div>
              <Label>E-Wallet Provider *</Label>
              <Input value={accountForm.provider || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, provider: e.target.value }))} placeholder="Provider (e.g., GCash)" />
              <Label className="mt-2">Wallet ID / Account Number *</Label>
              <Input value={accountForm.account_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_number: e.target.value }))} placeholder="1111-2222-3333" />
              <Label className="mt-2">Account Name</Label>
              <Input value={accountForm.account_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_name: e.target.value }))} placeholder="Full name" />
              <Label className="mt-2">Contact Number</Label>
              <Input value={accountForm.contact_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, contact_number: e.target.value }))} placeholder="09171234567" />
            </div>
          )}

          {methodLocal === 'bank' && (
            <div>
              <Label>Bank Name *</Label>
              <Input value={accountForm.bank_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, bank_name: e.target.value }))} placeholder="Bank" />
              <Label className="mt-2">Account Number *</Label>
              <Input value={accountForm.account_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_number: e.target.value }))} placeholder="1234567890" />
              <Label className="mt-2">Account Name *</Label>
              <Input value={accountForm.account_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_name: e.target.value }))} placeholder="Full name" />
              <Label className="mt-2">Account Type (optional)</Label>
              <Input value={accountForm.account_type || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_type: e.target.value }))} placeholder="savings / checking" />
              <Label className="mt-2">Branch (optional)</Label>
              <Input value={accountForm.branch || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, branch: e.target.value }))} placeholder="Branch" />
            </div>
          )}

          {methodLocal === 'remittance' && (
            <div>
              <Label>Service Provider *</Label>
              <Input value={accountForm.provider || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, provider: e.target.value }))} placeholder="Provider (e.g., Western Union)" />
              <Label className="mt-2">Receiver First Name *</Label>
              <Input value={accountForm.first_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
              <Label className="mt-2">Receiver Middle Name</Label>
              <Input value={accountForm.middle_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, middle_name: e.target.value }))} placeholder="Middle name (optional)" />
              <Label className="mt-2">Receiver Last Name *</Label>
              <Input value={accountForm.last_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
              <Label className="mt-2">Reference / Account *</Label>
              <Input value={accountForm.reference || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, reference: e.target.value }))} placeholder="Reference or account" />
              <Label className="mt-2">Contact Number *</Label>
              <Input value={accountForm.contact_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, contact_number: e.target.value }))} placeholder="09171234567" />
              <Label className="mt-2">Address (street)</Label>
              <Input value={accountForm.street || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, street: e.target.value }))} placeholder="Street" />
              <Label className="mt-2">Barangay</Label>
              <Input value={accountForm.barangay || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, barangay: e.target.value }))} placeholder="Barangay" />
              <Label className="mt-2">City</Label>
              <Input value={accountForm.city || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, city: e.target.value }))} placeholder="City" />
              <Label className="mt-2">Province</Label>
              <Input value={accountForm.province || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, province: e.target.value }))} placeholder="Province" />
              <Label className="mt-2">Zip Code</Label>
              <Input value={accountForm.zip_code || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, zip_code: e.target.value }))} placeholder="Zip code" />
              <Label className="mt-2">Country</Label>
              <Input value={accountForm.country || 'Philippines'} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, country: e.target.value }))} placeholder="Country" />
              <Label className="mt-2">Valid ID Type</Label>
              <Input value={accountForm.valid_id_type || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, valid_id_type: e.target.value }))} placeholder="Valid ID Type (optional)" />
              <Label className="mt-2">Valid ID Number</Label>
              <Input value={accountForm.valid_id_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, valid_id_number: e.target.value }))} placeholder="ID number (optional)" />
            </div>
          )}

          {!validated.ok && validated.missing.length > 0 && (
            <div className="text-sm text-red-600">Required: {validated.missing.join(', ')}</div>
          )}

        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto bg-blue-600" onClick={async () => { const v = validate(methodLocal, accountForm); if (!v.ok) { toastLocal({ title: 'Validation', description: `Please fill: ${v.missing.join(', ')}`, variant: 'destructive' }); return; } await onSubmit(); }} disabled={addingAccount || !validated.ok}>{addingAccount ? 'Saving...' : 'Save & Continue'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Types
interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price?: number;
  total?: number;
  product_image?: string;
  image?: string;
  product?: {
    id?: string;
    name?: string;
    description?: string;
    image?: string | null;
    price?: number | null;
    skus?: Array<{
      id: string;
      sku_code?: string | null;
      price?: number | null;
      image?: string | null;
      option_ids?: any;
      option_map?: Record<string, string>;
    }>;
    variants?: Array<{
      id: string;
      title: string;
      options?: Array<{ id: string; title: string }>;
    }>;
    media_files?: Array<{ file_url?: string }>;
  };
  shop?: {
    id: string;
    name: string;
  };
}

interface RefundDetail {
  refund_id: string;
  reason: string;
  detailed_reason?: string;
  status: string;
  refund_type: string;
  buyer_preferred_refund_method: string;
  requested_at: string;
  processed_at?: string;
  order_id: string;
  order_info?: any;
  refund_payment_status?: string;
  customer_note?: string;
  final_refund_method?: string;
  processed_by?: string;
  buyer_notified_at?: string;
  total_refund_amount?: number | null;
  evidence?: any[];
  available_actions?: string[];
  order_items?: OrderItem[];
  payment_details?: any;
  return_request?: any;
  timeline?: any[];
  shop?: {
    id: string;
    name: string;
  };
  dispute_request?: {
    id: string;
    status: string;
    created_at?: string;
    resolved_at?: string;
    reason?: string;
  };
  seller_suggested_method?: string;
  seller_suggested_amount?: number;
  seller_suggested_reason?: string;
  negotiation_deadline?: string;
  tracking_number?: string;
  logistic_service?: string;
  [key: string]: any;
}

// Status Configuration
const STATUS_CONFIG: Record<string, any> = {
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
    icon: Clock,
    description: 'Seller needs to review your request within 48 hours',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'current', icon: Clock },
      { label: 'Seller Response', status: 'pending', icon: MessageCircle },
      { label: 'Return Process', status: 'pending', icon: Package },
      { label: 'Refund Process', status: 'pending', icon: RefreshCw },
    ]
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    icon: MessageCircle,
    description: 'Seller has made a counter offer - please respond',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Offer Received', status: 'current', icon: MessageCircle },
      { label: 'Your Response', status: 'pending', icon: CheckCircle },
      { label: 'Agreement', status: 'pending', icon: CheckCircle },
    ]
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    icon: CheckCircle,
    description: 'Seller approved your refund request',
    progress: 3,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Awaiting Return', status: 'current', icon: Package },
      { label: 'Refund Process', status: 'pending', icon: RefreshCw },
    ]
  },
  waiting: {
    label: 'Waiting For Return',
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200',
    icon: Package,
    description: 'Please return the item to receive your refund',
    progress: 4,
    timeline: [
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Return Scheduled', status: 'completed', icon: Calendar },
      { label: 'In Transit', status: 'current', icon: Truck },
      { label: 'Item Received', status: 'pending', icon: PackageCheck },
    ]
  },
  to_ship: {
    label: 'To Ship',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
    icon: Truck,
    description: 'Seller has approved the return — please ship the item',
    progress: 4,
    timeline: [
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Prepare Item', status: 'current', icon: Package },
      { label: 'Ship Item', status: 'pending', icon: Truck },
      { label: 'In Transit', status: 'pending', icon: Calendar },
    ]
  },
  to_verify: {
    label: 'To Verify',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: PackageCheck,
    description: 'Seller is verifying the returned item condition',
    progress: 5,
    timeline: [
      { label: 'Item Received', status: 'completed', icon: Package },
      { label: 'Quality Check', status: 'current', icon: PackageCheck },
      { label: 'Condition Assessment', status: 'pending', icon: CheckCircle },
    ]
  },
  to_process: {
    label: 'To Process',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
    icon: RefreshCw,
    description: 'Seller is processing your refund payment',
    progress: 6,
    timeline: [
      { label: 'Verification Complete', status: 'completed', icon: CheckSquare },
      { label: 'Refund Processing', status: 'current', icon: RefreshCw },
      { label: 'Refund Sent', status: 'pending', icon: CheckCircle },
    ]
  },
  dispute: {
    label: 'Dispute',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
    icon: AlertTriangle,
    description: 'Case escalated to admin for resolution',
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
    description: 'Refund process completed successfully',
    progress: 7,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Refund Processed', status: 'completed', icon: RefreshCw },
      { label: 'Completed', status: 'current', icon: CheckSquare },
    ]
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
    icon: XCircle,
    description: 'Seller rejected your refund request',
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
    description: 'Refund request was cancelled',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Cancelled', status: 'current', icon: Ban },
    ]
  }
};

// Utility Functions
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000";

function toAbsolute(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith('/') ? u : `/media/${u}`;
  return `${MEDIA_URL}${path}`;
}

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return 'Invalid date';
  }
}

function formatCurrency(amount: string | number) {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!Number.isFinite(numAmount)) return "₱0.00";
    return `₱${numAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  } catch {
    return "₱0.00";
  }
}

// Human-friendly display for seller's suggestion (combines type + method)
function getSellerSuggestionLabel(refund: RefundDetail | null): string | null {
  if (!refund) return null;
  const method = (refund.seller_suggested_method || '').toString().toLowerCase().trim();
  const type = (refund.seller_suggested_type || '').toString().toLowerCase().trim();
  const m = method;
  const t = type;
  const make = (tVal: string, mapping: Record<string,string>) => {
    if (mapping[m]) return mapping[m];
    if (m === 'wallet') return tVal === 'keep' ? 'Partial Refund to Wallet' : 'Refund to Wallet';
    if (m === 'bank') return tVal === 'keep' ? 'Partial Bank Transfer' : 'Bank Transfer';
    if (m === 'remittance') return tVal === 'keep' ? 'Partial Money Back' : 'Money Back';
    if (m === 'voucher') return tVal === 'keep' ? 'Partial Refund Voucher' : 'Store Voucher';
    return null;
  };

  if (t === 'keep') {
    const label = make('keep', {});
    return label ? `Keep Item and ${label}` : null;
  }
  if (t === 'return') {
    const label = make('return', {});
    return label ? `Return Item and ${label}` : null;
  }

  // Fallback to method label only
  const fallback = {
    'wallet': 'Refund to Wallet',
    'bank': 'Bank Transfer',
    'remittance': 'Money Back',
    'voucher': 'Store Voucher'
  } as Record<string,string>;
  return fallback[m] || (method ? method : null);
}

function getSelectedSku(item: OrderItem) {
  const optionMap: Record<string, string> = (item.product?.variants || []).reduce((acc: Record<string,string>, v: any) => {
    (v.options || []).forEach((opt: any) => acc[String(opt.id)] = opt.title);
    return acc;
  }, {} as Record<string,string>);

  const serverSku = (item as any).sku || (item as any).selected_sku || null;
  if (serverSku) {
    const selectedSku = {
      id: serverSku.sku_id || serverSku.id || null,
      sku_code: serverSku.sku_code || null,
      price: serverSku.price != null ? Number(serverSku.price) : null,
      image: serverSku.sku_image || serverSku.image || null,
      option_ids: serverSku.option_ids || null,
    };
    const selectedOptionIds = Array.isArray(selectedSku.option_ids) ? selectedSku.option_ids : (selectedSku.option_ids ? [selectedSku.option_ids] : []);
    const humanLabel = selectedOptionIds.length ? selectedOptionIds.map((id: any) => optionMap[String(id)] || String(id)).filter(Boolean).join(' • ') : (selectedSku.sku_code || null);
    return { selectedSku, humanLabel, selectedOptionIds };
  }

  let selectedSku: any = null;
  const skus = item.product?.skus || [];

  const preferredOptionIds = (item as any).option_ids || (item as any).selected_option_ids || null;
  if (preferredOptionIds && Array.isArray(preferredOptionIds) && preferredOptionIds.length && skus) {
    selectedSku = skus.find((s: any) => {
      const skuIds = (s.option_ids || []).map((x: any) => String(x));
      return skuIds.length === preferredOptionIds.length && skuIds.sort().join(',') === preferredOptionIds.map(String).sort().join(',');
    });
  }

  if (!selectedSku && skus.length) selectedSku = skus[0];

  const labelIds = Array.isArray(selectedSku?.option_ids) ? selectedSku.option_ids : (selectedSku?.option_ids ? [selectedSku.option_ids] : []);
  const label = labelIds.map((id: any) => optionMap[String(id)] || String(id)).filter(Boolean).join(' • ');
  return { selectedSku, humanLabel: label || selectedSku?.sku_code || null, selectedOptionIds: labelIds };
}

// ========== SEPARATED UI FUNCTIONS ==========

function PendingStatusUI({ refund }: { refund?: Partial<any> }) {
  const refLabel = refund?.refund_id || refund?.refund || refund?.id || 'this request';
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-yellow-600" />
        <div className="flex-1">
          <p className="font-medium text-yellow-800">Request Under Review</p>
          <p className="text-sm text-yellow-700 mb-2">
            Your refund request <strong>{refLabel}</strong> is pending review by the seller. Seller has 48 hours to respond. If the seller does not respond, the moderation team will automatically approve and process the refund within 3 days.
          </p>
         
        </div>
      </div>
    </div>
  );
}

function NegotiationStatusUI({ refund, formatDate, formatCurrency }: { refund: RefundDetail; formatDate: (d: string) => string; formatCurrency: (a: number | string) => string }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-blue-600" />
        <div>
          <p className="font-medium text-blue-800">Seller's Counter Offer</p>
          <p className="text-sm text-blue-700 mb-2">Review the seller's proposed solution</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <span className="text-sm text-gray-600">Method:</span>
              <p className="font-medium text-sm">{getSellerSuggestionLabel(refund) || refund.seller_suggested_method || 'Not specified'}</p>
            </div>
            {refund.seller_suggested_amount && (
              <div>
                <span className="text-sm text-gray-600">Amount:</span>
                <p className="font-medium text-sm text-green-600">{formatCurrency(refund.seller_suggested_amount)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApprovedStatusUI({ refund, onOpenTrackingDialog, formatCurrency }: { refund: RefundDetail; onOpenTrackingDialog?: () => void; formatCurrency: (a: number | string) => string }) {
  const isReturnItem = refund.refund_type === 'return';
  const isKeepItem = refund.refund_type === 'keep';
  const rrStatus = String(refund.return_request?.status || '').toLowerCase();
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();
  const rrTracking = String(refund.return_request?.tracking_number || '').trim();
  const hasShippingInfo = Boolean(rrTracking) || rrStatus === 'shipped' || rrStatus === 'received';
  // Processing applies to:
  // - Return items: when return_request.status is 'approved' and payment is 'processing'
  // - Keep items: when refund.status is 'approved' and payment is 'processing'
  const dr = (refund as any).dispute || (refund as any).dispute_request || null;
  const isProcessing = (
    // Return items normally require return_request to be approved
    (isReturnItem && rrStatus === 'approved' && payStatus === 'processing' && String(refund.status || '').toLowerCase() === 'approved') ||
    // Keep items show processing when payment_status is processing
    (isKeepItem && payStatus === 'processing' && String(refund.status || '').toLowerCase() === 'approved') ||
    // Special case: dispute approved by admin can trigger processing even if return_request is rejected
    (dr && String((dr.status || '').trim()).toLowerCase() === 'approved' && String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'processing')
  );

  const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
  const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
  const canProvideShipping = !isReturnAcceptedWaitingModeration;
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="font-medium text-green-800">Request Approved</p>
          {isProcessing ? (
            <div className="mt-3">
              <ToProcessStatusUI refund={refund} formatCurrency={formatCurrency} />
            </div>
          ) : ((payStatus === 'completed' && String(refund.status || '').toLowerCase() === 'approved') || String(refund.status || '').toLowerCase() === 'completed') ? (
            <div className="mt-3">
              <PaymentCompletedUI refund={refund} formatCurrency={formatCurrency} />
            </div>
          ) : (
            // For return items, do not show the 'Please return' message if the buyer already provided shipping info
            (!isReturnItem ? (
              <p className="text-sm text-green-700">Your refund will be processed soon</p>
            ) : (
              // Special case: seller accepted the return (rrStatus === 'approved') and payment is pending -> moderation will process the refund
              (rrStatus === 'approved' && payStatus === 'pending' && ((String(refund.final_refund_type || '').toLowerCase() === 'return') || (String(refund.refund_type || '').toLowerCase() === 'return'))) ? (
                <ReturnAcceptedModerationUI refund={refund} />
              ) : (!hasShippingInfo ? (
                <p className="text-sm text-green-700">Please return the item to complete your refund</p>
              ) : null)
            ))
          )}

          {/* Return deadline and address for return refunds */}
          {isReturnItem && !hasShippingInfo && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Return Deadline</div>
                <div className="font-medium">
                  {refund.return_request?.return_deadline || refund.return_deadline ? formatDate(refund.return_request?.return_deadline || refund.return_deadline || '') : 'Not set'}
                </div>
                {refund.return_request?.return_deadline && (() => {
                  try {
                    const dl = new Date(refund.return_request.return_deadline);
                    const daysLeft = Math.ceil((dl.getTime() - Date.now()) / (1000*60*60*24));
                    return <div className="text-xs text-gray-500 mt-1">{daysLeft >= 0 ? `${daysLeft} day(s) left` : 'Deadline passed'}</div>;
                  } catch { return null; }
                })()}
              </div>

              <div>
                <div className="text-xs text-gray-500">Return Address</div>
                {refund.return_address ? (
                  <div className="font-medium">
                    <div>{refund.return_address.recipient_name} — {refund.return_address.contact_number}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}
                    </div>
                    {refund.return_address.notes && <div className="text-xs text-gray-500 mt-1">{refund.return_address.notes}</div>}
                  </div>
                ) : (
                  <div className="font-medium">Not provided</div>
                )}
              </div>
            </div>
          )}

          {isReturnItem && refund.return_request?.status === 'shipped' && (
            <div className="mt-3 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
              <p className="font-medium">Item has been shipped</p>
              <p className="text-sm">Waiting for the seller to receive the item.</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {refund.return_request?.tracking_number && (
                  <div>
                    <p className="text-xs text-gray-600">Tracking Number</p>
                    <p className="font-medium">{refund.return_request.tracking_number}</p>
                  </div>
                )}

                {refund.return_request?.logistic_service && (
                  <div>
                    <p className="text-xs text-gray-600">Shipping Service</p>
                    <p className="font-medium">{refund.return_request.logistic_service}</p>
                  </div>
                )}

                {refund.return_request?.shipped_at && (
                  <div>
                    <p className="text-xs text-gray-600">Shipped At</p>
                    <p className="font-medium">{formatDate(refund.return_request.shipped_at)}</p>
                  </div>
                )}

                {refund.return_request?.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-sm text-gray-700">{refund.return_request.notes}</p>
                  </div>
                )}
              </div>

              {refund.return_request?.media && refund.return_request.media.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600">Uploaded files</p>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {refund.return_request.media.map((m: any, idx: number) => (
                      <a key={m.id || idx} href={m.file_url || '#'} target="_blank" rel="noreferrer" className="block rounded overflow-hidden bg-gray-100 border">
                        {m.file_type && m.file_type.startsWith('image/') ? (
                          <img src={m.file_url} alt={`Return media ${idx + 1}`} className="w-full h-20 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center text-gray-500">{m.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {canProvideShipping && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => onOpenTrackingDialog && onOpenTrackingDialog()} className="h-8">Update shipping info</Button>
                </div>
              )}
            </div>
          )}

          {isReturnItem && refund.return_request?.status === 'received' && (
            <div className="mt-3 p-3 rounded bg-green-50 border border-green-200 text-green-800">
              <p className="font-medium">Item received by seller</p>
              <p className="text-sm">Seller has received the item and will inspect its condition. You will be notified after inspection.</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {refund.return_request?.received_at && (
                  <div>
                    <p className="text-xs text-gray-600">Received At</p>
                    <p className="font-medium">{formatDate(refund.return_request.received_at)}</p>
                  </div>
                )}

                {refund.return_request?.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-sm text-gray-700">{refund.return_request.notes}</p>
                  </div>
                )}
              </div>

              {refund.return_request?.media && refund.return_request.media.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600">Uploaded files</p>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {refund.return_request.media.map((m: any, idx: number) => (
                      <a key={m.id || idx} href={m.file_url || '#'} target="_blank" rel="noreferrer" className="block rounded overflow-hidden bg-gray-100 border">
                        {m.file_type && m.file_type.startsWith('image/') ? (
                          <img src={m.file_url} alt={`Return media ${idx + 1}`} className="w-full h-20 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center text-gray-500">{m.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => window.alert('Contact the seller') } className="h-8">Contact Seller</Button>
              </div>
            </div>
          )}

          {isReturnItem && refund.return_request?.status === 'inspected' && (
            <div className="mt-3 p-3 rounded bg-purple-50 border border-purple-200 text-purple-800">
              <p className="font-medium">Item inspected</p>
              <p className="text-sm">Seller has inspected the item and is processing your refund. You will be notified of the inspection result and next steps.</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {refund.return_request?.updated_at && (
                  <div>
                    <p className="text-xs text-gray-600">Inspected At</p>
                    <p className="font-medium">{formatDate(refund.return_request.updated_at)}</p>
                  </div>
                )}

                {refund.return_request?.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-sm text-gray-700">{refund.return_request.notes}</p>
                  </div>
                )}
              </div>

              {refund.return_request?.media && refund.return_request.media.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600">Uploaded files</p>
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {refund.return_request.media.map((m: any, idx: number) => (
                      <a key={m.id || idx} href={m.file_url || '#'} target="_blank" rel="noreferrer" className="block rounded overflow-hidden bg-gray-100 border">
                        {m.file_type && m.file_type.startsWith('image/') ? (
                          <img src={m.file_url} alt={`Return media ${idx + 1}`} className="w-full h-20 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center text-gray-500">{m.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => window.alert('Contact the seller') } className="h-8">Contact Seller</Button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function WaitingStatusUI({ refund, onOpenTrackingDialog, actionLoading, onSubmitReturn, detailsSubmittedMessage }: { refund: RefundDetail; onOpenTrackingDialog?: () => void; actionLoading?: boolean; onSubmitReturn?: (formData: FormData) => Promise<boolean | void>; detailsSubmittedMessage?: string | null }) {
  const rr: any = refund.return_request;
  const deadline = rr?.return_deadline || refund.return_deadline || null;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  
  const isShipped = Boolean(rr?.status && ['shipped', 'received', 'inspected', 'completed'].includes(rr.status));
  const isReceived = Boolean(rr?.status && ['received', 'inspected', 'completed'].includes(rr.status));

  // Disallow buyer-provided shipping info when seller already accepted the return and moderation will process the refund
  const rrStatus = String(rr?.status || '').toLowerCase();
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();
  const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
  const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
  const canProvideShipping = !isReturnAcceptedWaitingModeration;

  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
      trackingNumber: rr?.tracking_number || '',
      logisticService: rr?.logistic_service || '',
      shippedDate: rr?.shipped_at ? formatDateForInput(rr.shipped_at) : '',
      notes: '',
      mediaFiles: [] as File[]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: value
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const filesArray = Array.from(e.target.files);
          setFormData(prev => ({
              ...prev,
              mediaFiles: [...prev.mediaFiles, ...filesArray]
          }));
      }
  };

  const removeFile = (index: number) => {
      setFormData(prev => ({
          ...prev,
          mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
          const submitData = new FormData();
          submitData.append('tracking_number', formData.trackingNumber);
          submitData.append('logistic_service', formData.logisticService);
          submitData.append('shipped_at', formData.shippedDate);
          submitData.append('notes', formData.notes);
          
          formData.mediaFiles.forEach(file => {
              submitData.append('media_files', file);
          });

          if (typeof onSubmitReturn === 'function') {
            const ok = await onSubmitReturn(submitData);
            if (ok) {
              toast({ title: 'Success', description: 'Return information submitted successfully' });
              setShowDetails(false);
            } else {
              toast({ title: 'Error', description: 'Failed to submit return information', variant: 'destructive' });
            }
          } else {
            await AxiosInstance.post(`/return-refund/${refund.refund_id}/update_tracking/`, submitData, { headers: { 'X-User-Id': '' } });
            toast({ title: 'Success', description: 'Return information submitted successfully' });
            setShowDetails(false);
          }

          try { await AxiosInstance.get(`/return-refund/${refund.refund_id}/get_my_refund/`); } catch (e) {}

      } catch (error: any) {
          console.error('Failed to submit return details:', error);
          const msg = error?.response?.data?.error || 'Failed to submit return info';
          toast({ title: 'Error', description: msg, variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Package className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-indigo-800">Waiting for Return</p>
              <p className="text-sm text-indigo-700 mb-2">
                {isShipped 
                  ? 'Your return is in progress. Track the status below.' : 'Please prepare your shipment to send the item back to the seller.'}
              </p>

              {detailsSubmittedMessage && (
                <div className="mt-3 p-3 rounded bg-green-50 border border-green-200 text-green-800">
                  <p className="text-sm font-medium">{detailsSubmittedMessage}</p>
                </div>
              )}

              {refund?.return_address && (
                <div className="mt-3 bg-white border border-gray-200 rounded-md p-3">
                  <p className="text-sm font-medium">Return address</p>
                  <p className="text-sm text-gray-700">{refund.return_address.recipient_name} — {refund.return_address.contact_number}</p>
                  <p className="text-sm text-gray-700">{refund.return_address.street}, {refund.return_address.barangay}, {refund.return_address.city}, {refund.return_address.province} {refund.return_address.zip_code}, {refund.return_address.country}</p>
                  {refund.return_address.notes && <p className="text-sm text-gray-600 mt-1">{refund.return_address.notes}</p>}
                </div>
              )}              

              {isShipped && rr?.status === 'shipped' && (
                <div className="mt-3 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800">
                  <p className="font-medium">Item has been shipped</p>
                  <p className="text-sm">Waiting for the seller to receive the item.</p>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rr?.tracking_number && (
                      <div>
                        <p className="text-xs text-gray-600">Tracking Number</p>
                        <p className="font-medium">{rr.tracking_number}</p>
                      </div>
                    )}

                    {rr?.logistic_service && (
                      <div>
                        <p className="text-xs text-gray-600">Shipping Service</p>
                        <p className="font-medium">{rr.logistic_service}</p>
                      </div>
                    )}

                    {rr?.shipped_at && (
                      <div>
                        <p className="text-xs text-gray-600">Shipped At</p>
                        <p className="font-medium">{formatDate(rr.shipped_at)}</p>
                      </div>
                    )}

                    {rr?.notes && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-600">Notes</p>
                        <p className="text-sm text-gray-700">{rr.notes}</p>
                      </div>
                    )}
                  </div>

                  {rr?.media && rr.media.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600">Uploaded files</p>
                      <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {rr.media.map((m: any, idx: number) => (
                          <a key={m.id || idx} href={m.file_url || '#'} target="_blank" rel="noreferrer" className="block rounded overflow-hidden bg-gray-100 border">
                            {m.file_type && m.file_type.startsWith('image/') ? (
                              <img src={m.file_url} alt={`Return media ${idx + 1}`} className="w-full h-20 object-cover" />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center text-gray-500">{m.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {canProvideShipping && (
                    <div className="mt-3">
                      <Button variant="ghost" size="sm" onClick={() => setShowDetails(true)} className="h-8">Update shipping info</Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 space-y-1">
                {rr?.return_method && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{rr.return_method}</span>
                  </div>
                )}
                
                {deadlineDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Deadline:</span>
                    <span className="font-medium">
                      {formatDate(deadlineDate.toISOString())}
                      {daysLeft !== null && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                          daysLeft <= 3 
                            ? 'bg-red-100 text-red-800' 
                            : daysLeft <= 7 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 h-8"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Status indicator */}
        <div className="mt-3 flex items-center gap-2">
          <Badge className={`px-2 py-0.5 text-xs capitalize ${
            rr?.status === 'shipped' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200' :
            rr?.status === 'received' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' :
            rr?.status === 'inspected' ? 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200' :
            rr?.status === 'completed' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200' :
            'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200'
          }`}>
            {rr?.status || 'pending'}
          </Badge>
          
          {isShipped && rr?.tracking_number && (
            <span className="text-xs text-green-700 flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Shipped
            </span>
          )}
        </div>
      </div>

      {/* Expanded View Details */}
      {showDetails && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Submit Return Information</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(false)}
            >
              Close
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="trackingNumber" className="text-sm font-medium">
                  Tracking Number *
                </label>
                <Input
                  id="trackingNumber"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={handleInputChange}
                  placeholder="Enter tracking number"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="logisticService" className="text-sm font-medium">
                  Shipping Service *
                </label>
                <Input
                  id="logisticService"
                  name="logisticService"
                  value={formData.logisticService}
                  onChange={handleInputChange}
                  placeholder="e.g., DHL, FedEx, UPS"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="shippedDate" className="text-sm font-medium">
                Shipping Date *
              </label>
              <Input
                id="shippedDate"
                name="shippedDate"
                type="date"
                value={formData.shippedDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any notes about the return..."
                className="w-full min-h-[80px] p-2 border rounded-md text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload Return Evidence (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label htmlFor="fileUpload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <p className="text-xs font-medium">Click to upload files</p>
                  </div>
                </label>
              </div>

              {formData.mediaFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium">Files to upload:</p>
                  {formData.mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                      <div className="flex items-center gap-1 truncate">
                        <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-5 w-5 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || actionLoading || !formData.logisticService.trim() || !formData.trackingNumber.trim() || !formData.shippedDate}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Return Information'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ToVerifyStatusUI() {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <PackageCheck className="h-5 w-5 text-purple-600" />
        <div>
          <p className="font-medium text-purple-800">Item Verification in Progress</p>
          <p className="text-sm text-purple-700">
            Seller is checking the returned item's condition. This usually takes 1-3 business days.
          </p>
        </div>
      </div>
    </div>
  );
}

// New UI shown to customer when seller accepted return and moderation needs to process the refund
function ReturnAcceptedModerationUI({ refund }: { refund: RefundDetail }) {
  return (
    <div className="mt-3 p-3 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
      <p className="font-medium">Return Accepted</p>
      <p className="text-sm mt-1">Seller accepted your return request. Waiting for the moderation team to process the refund.</p>
      {refund?.return_request?.return_deadline && (
        <div className="text-xs text-gray-600 mt-2">Return Deadline: {formatDate(refund.return_request.return_deadline)}</div>
      )}
    </div>
  );
}

function ToProcessStatusUI({ refund, formatCurrency }: { refund: RefundDetail; formatCurrency: (a: number | string) => string }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-purple-600" />
        <div>
          <p className="font-medium text-purple-800">Refund Processing</p>
          <p className="text-sm text-purple-700">Your refund is being processed</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-sm">Amount: <strong className="text-green-600">{formatCurrency(refund.total_refund_amount || 0)}</strong></span>
            <span className="text-sm">Method: <strong>{refund.final_refund_method || refund.buyer_preferred_refund_method}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentCompletedUI({ refund, formatCurrency }: { refund: RefundDetail; formatCurrency: (a: number | string) => string }) {
  const processedAt = refund.processed_at || refund.processedAt || null;
  const method = refund.final_refund_method || refund.buyer_preferred_refund_method || '—';

  return (
    <div className="mt-3 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
      <p className="font-medium">Refund Payment Completed</p>
      <p className="text-sm">Your refund payment has been completed. The amount has been sent via the selected method.</p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-600">Amount</p>
          <p className="font-medium">{formatCurrency(refund.total_refund_amount || 0)}</p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Method</p>
          <p className="font-medium">{method}</p>
        </div>

        {processedAt && (
          <div>
            <p className="text-xs text-gray-600">Completed At</p>
            <p className="font-medium">{formatDate(processedAt)}</p>
          </div>
        )}

        {refund.seller_response && (
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-600">Seller Note</p>
            <p className="text-sm text-gray-700">{refund.seller_response}</p>
          </div>
        )}

        {refund?.proofs && refund.proofs.length > 0 && (
          <div className="sm:col-span-2 mt-3">
            <p className="text-xs text-gray-600">Seller Proofs</p>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {refund.proofs.map((p: any, idx: number) => (
                <a key={p.id || idx} href={p.file_url || '#'} target="_blank" rel="noreferrer" className="block rounded overflow-hidden bg-gray-100 border">
                  {p.file_type && p.file_type.startsWith('image/') ? (
                    <img src={p.file_url} alt={`Proof ${idx + 1}`} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center text-gray-500">{p.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DisputeStatusUI({ refund, formatCurrency, user }: { refund: RefundDetail; formatCurrency: (a: number | string) => string; user?: any }) {
  // Use whichever dispute shape is present
  const dr = (refund as any).dispute || (refund as any).dispute_request || null;

  // Special case: dispute approved by admin and return_request was previously rejected
  if (dr && String((dr.status || '').trim()).toLowerCase() === 'approved' && String(refund.return_request?.status || '').toLowerCase() === 'rejected') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-800">Dispute Approved</p>
            <p className="text-sm text-emerald-700 mt-1">Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.</p>
            {dr?.resolved_at && <p className="text-xs text-gray-500 mt-2">Approved at: {formatDate(String(dr.resolved_at))}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Show processing UI for disputes only if backend has already set refund to approved+processing
  if (dr && String((dr.status || '').trim()).toLowerCase() === 'approved') {
    const payStatus = String(refund.refund_payment_status || '').toLowerCase();
    const refundStatus = String(refund.status || '').toLowerCase();

    if (refundStatus === 'approved' && payStatus === 'processing') {
      // Backend already set processing: show unified processing UI
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-emerald-800">Dispute Approved</p>
              <p className="text-sm text-emerald-700 mt-1">Your dispute has been approved by the administrator. The admin will process the refund.</p>
              {dr?.resolved_at && <p className="text-xs text-gray-500 mt-2">Approved at: {formatDate(String(dr.resolved_at))}</p>}

              <div className="mt-3">
                <ToProcessStatusUI refund={refund} formatCurrency={formatCurrency} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Otherwise show a friendly approved message until processing starts
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-800">Dispute Approved</p>
            <p className="text-sm text-emerald-700 mt-1">Your dispute has been approved by the administrator. The admin will process the refund request — you will be notified once the refund is processed.</p>
            {dr?.resolved_at && <p className="text-xs text-gray-500 mt-2">Approved at: {formatDate(String(dr.resolved_at))}</p>}
          </div>
        </div>
      </div>
    );
  }

  // If admin rejected the dispute but refund still shows 'dispute', inform the buyer
  if (dr && String((dr.status || '').trim()).toLowerCase() === 'rejected' && String(refund.status || '').toLowerCase() === 'dispute') {

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Dispute Rejected</p>
            <p className="text-sm text-red-700 mt-1">The administrator has rejected your dispute for this refund. The refund remains in dispute — if you believe this is a mistake, you can confirm you received this decision.</p>
            {dr?.processed_by && (
              <p className="text-xs text-gray-500 mt-2">Processed by: <strong>{(dr as any).processed_by?.username || (dr as any).processed_by?.email || 'Admin'}</strong></p>
            )}
            {dr?.resolved_at && <p className="text-xs text-gray-500">Resolved at: {formatDate(String(dr.resolved_at))}</p>}
            {((dr as any).admin_notes) && (
              <div className="mt-3 p-3 bg-white border rounded text-sm text-gray-700">
                <div className="text-xs text-gray-500">Admin notes</div>
                <div className="mt-1">{(dr as any).admin_notes}</div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <div className="text-xs text-gray-500">Use the actions card on the right to acknowledge this decision.</div>
              <Button variant="outline" size="sm" onClick={() => window.alert('Contact support')}>
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-600" />
        <div>
          <p className="font-medium text-orange-800">Dispute Information</p>
          <p className="text-sm text-orange-700">
            Case is under administrative review. An administrator will review all evidence and communications.
          </p>
        </div>
      </div>
    </div>
  );
}

function CompletedStatusUI({ refund, formatCurrency }: { refund: RefundDetail; formatCurrency: (a: number | string) => string }) {
  // Check if a dispute was associated and was resolved
  const dr = (refund as any).dispute || (refund as any).dispute_request || null;
  const isResolved = dr && String((dr.status || '').trim()).toLowerCase() === 'resolved';

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckSquare className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-emerald-800">Refund Completed</p>
          <p className="text-sm text-emerald-700 mt-1">
            Your refund has been successfully completed.
            {refund.total_refund_amount && (
              <span className="font-bold ml-2">{formatCurrency(refund.total_refund_amount)}</span>
            )}
          </p>

          {isResolved && (
            <div className="mt-3 p-3 bg-white border rounded text-sm text-gray-700">
              <div className="text-sm font-medium text-emerald-800">Resolved After Dispute</div>
              <div className="text-xs text-gray-500 mt-1">This refund was completed after an administrative review of the dispute.</div>
              {dr?.processed_by && (
                <div className="text-xs text-gray-500 mt-2">Processed by: <strong>{(dr as any).processed_by?.username || (dr as any).processed_by?.email || 'Admin'}</strong></div>
              )}
              {dr?.resolved_at && (
                <div className="text-xs text-gray-500">Resolved at: {formatDate(String(dr.resolved_at))}</div>
              )}
              {(dr as any)?.admin_notes && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">{(dr as any).admin_notes}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RejectedStatusUI({ refund, formatCurrency, onFileDispute, fileDisabled }: { refund: RefundDetail; formatCurrency?: (a: number | string) => string; onFileDispute?: () => void; fileDisabled?: boolean }) {
  const latestCounter = (refund && (refund as any).counter_requests && (refund as any).counter_requests.length > 0) ? (refund as any).counter_requests[0] : null;

  // Case: negotiation ended because buyer rejected seller's counter
  if (latestCounter && latestCounter.status === 'rejected') {
    const amt = latestCounter.counter_refund_amount;
    const method = latestCounter.counter_refund_method || '';
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Negotiation Closed</p>
            <p className="text-sm text-red-700 mt-1">
              You rejected the seller's counter-offer{amt != null ? ` of ${formatCurrency ? formatCurrency(amt) : amt}` : ''}{method ? ` via ${method}` : ''}.
            </p>
            {latestCounter.notes && (
              <p className="text-xs text-red-600 mt-2">Seller notes: {latestCounter.notes}</p>
            )}

            <div className="mt-3 text-xs text-gray-500">Use the actions card on the right to file a dispute for this case.</div>
          </div>
        </div>
      </div>
    );
  }

  // Case: seller directly rejected the buyer's original request
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Request Rejected</p>
          <p className="text-sm text-red-700 mt-1">{refund.seller_response || 'No specific reason provided by seller'}</p>

          <div className="mt-3 text-xs text-gray-500">Use the actions card on the right to file a dispute for this case.</div>
        </div>
      </div>
    </div>
  );
}

function CancelledStatusUI() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <Ban className="h-5 w-5 text-gray-600" />
        <div>
          <p className="font-medium text-gray-800">Request Cancelled</p>
          <p className="text-sm text-gray-700">This refund request is no longer active</p>
        </div>
      </div>
    </div>
  );
}

function OrderItemsSection({ refund }: { refund: RefundDetail }) {
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
            <h3 className="font-medium text-gray-900">Items Requested for Return</h3>
            <p className="text-sm text-gray-600">{refund.order_items?.length || 0} item(s)</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && refund.order_items && refund.order_items.length > 0 && (
        <div className="p-4 border-t space-y-3">
          {refund.order_items.map((item: any, index: number) => {
            const { selectedSku, humanLabel } = getSelectedSku(item as OrderItem);
            const imageSrc = toAbsolute(selectedSku?.image || item.product?.image || item.product_image || item.image) || "/phon.jpg";
            
            return (
              <div key={item.product_id || index} className="flex gap-3 p-3 border rounded hover:bg-gray-50">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden border">
                    <img
                      src={imageSrc}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/phon.jpg";
                      }}
                    />
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.product_name}</h4>
                  {humanLabel && (
                    <p className="text-xs text-gray-600 mt-1">{humanLabel}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                    {item.shop?.name && (
                      <span className="text-xs text-gray-600">Shop: {item.shop.name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatCurrency(item.price || 0)}</div>
                  {item.total && (
                    <div className="text-xs text-green-600">Total: {formatCurrency(item.total)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomerDetailsSection({ refund }: { refund: RefundDetail }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Request Details</h3>
            <p className="text-sm text-gray-600">Refund information and timeline</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Refund Amount</Label>
              <p className="font-bold text-green-600 text-lg">{formatCurrency(refund.total_refund_amount || 0)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Refund Type</Label>
              <p className="font-medium capitalize">{refund.refund_type?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Preferred Method</Label>
              <div className="flex items-center gap-2">
                {refund.buyer_preferred_refund_method === 'wallet' && <Wallet className="h-4 w-4 text-gray-500" />}
                {refund.buyer_preferred_refund_method === 'bank' && <Building className="h-4 w-4 text-gray-500" />}
                {refund.buyer_preferred_refund_method === 'remittance' && <CreditCard className="h-4 w-4 text-gray-500" />}
                <span className="font-medium capitalize">
                  {refund.buyer_preferred_refund_method?.replace('_', ' ') || '—'}
                </span>
              </div>
            </div>
           
          </div>

          <Separator />

          <div>
            <Label className="text-sm text-gray-600">Reason for Refund</Label>
            <div className="mt-1 bg-gray-50 p-3 rounded text-sm">
              {refund.reason || 'No reason provided'}
            </div>
          </div>

          {refund.customer_note && (
            <div>
              <Label className="text-sm text-gray-600">Your Notes</Label>
              <div className="mt-1 bg-blue-50 p-3 rounded text-sm">
                <div className="whitespace-pre-wrap">{sanitizeCustomerNote(refund.customer_note)}</div>
              </div>
            </div>
          )}

          {refund.seller_response && (
            <div>
              <Label className="text-sm text-gray-600">Seller Response</Label>
              <div className="mt-1 bg-green-50 p-3 rounded text-sm">
                {refund.seller_response}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <Label className="text-sm text-gray-600">Timeline</Label>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Requested:</span>
                <span>{formatDate(refund.requested_at)}</span>
              </div>
              {refund.approved_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved:</span>
                  <span>{formatDate(refund.approved_at)}</span>
                </div>
              )}
              {refund.processed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed:</span>
                  <span>{formatDate(refund.processed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceSection({ refund }: { refund: RefundDetail }) {
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
            {refund.evidence.map((evidence: any, index: number) => {
              const isImage = evidence.file_type?.startsWith('image/') || 
                            evidence.file_data?.includes('.jpg') || 
                            evidence.file_data?.includes('.png') ||
                            evidence.file_data?.includes('.jpeg');
              
              return (
                <a
                  key={evidence.id || index}
                  href={evidence.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border overflow-hidden hover:border-blue-300 transition-colors"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    {isImage ? (
                      <img
                        src={evidence.file_url || ''}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                <path d="M10 9H8"/>
                                <path d="M16 13H8"/>
                                <path d="M16 17H8"/>
                              </svg>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t bg-white">
                    <div className="text-xs font-medium truncate">
                      {evidence.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderSection({ 
  refund, 
  statusConfig, 
  StatusIcon, 
  navigate, 
  shopId 
}: { 
  refund: RefundDetail;
  statusConfig: any;
  StatusIcon: any;
  navigate: any;
  shopId?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/return-refund')}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Refund Request Details</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>#{refund.refund_id?.slice(0, 8) || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              <span>Order #{refund.order_info?.order_number || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              <span className="text-sm">Amount: <strong className="text-green-600">{formatCurrency(refund.total_refund_amount || 0)}</strong></span>
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
            <DropdownMenuItem onClick={() => refund.shop?.id && navigate(`/shop/${refund.shop.id}`)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Shop
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/return-refund')}>
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
  refund: RefundDetail;
  navigate: any;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Actions</h3>
      <div className="space-y-2">
        {typeof renderStatusActions === 'function' ? renderStatusActions() : renderStatusActions}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refund.shop?.id && navigate(`/shop/${refund.shop.id}`)}
          className="w-full justify-start"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Visit Shop
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/order/${refund.order_info?.order_id}`)}
          className="w-full justify-start"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Order
        </Button>
      </div>
    </div>
  );
}

function ShopInfoSection({ refund, navigate }: { refund: RefundDetail; navigate: any }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium mb-3">Shop Information</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{refund.shop?.name || '—'}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refund.shop?.id && navigate(`/shop/${refund.shop.id}`)}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Visit Shop
        </Button>
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

function StatusAlertSection({ refund, statusConfig, StatusIcon }: { refund: RefundDetail; statusConfig: any; StatusIcon: any }) {
  const status = String(refund?.status || 'pending').toLowerCase().trim();

  // If negotiation ended because buyer rejected a seller counter and refund is rejected,
  // avoid showing the generic 'Rejected' alert to prevent duplication with the detailed card below.
  const latestCounter = (refund && (refund as any).counter_requests && (refund as any).counter_requests.length > 0) ? (refund as any).counter_requests[0] : null;
  if (status === 'rejected' && latestCounter && latestCounter.status === 'rejected') {
    return null;
  }

  // Determine dispute object if present
  const dr = (refund as any).dispute || (refund as any).dispute_request || null;

  // When dispute is already approved and refund remains in 'dispute', hide the generic "Dispute" alert
  // so the detailed approved message (shown elsewhere) is the only visible content.
  if (status === 'dispute' && dr && String((dr.status || '').trim()).toLowerCase() === 'approved') {
    return null;
  }
  
  return (
    <Alert className={statusConfig.color}>
      <StatusIcon className="h-4 w-4" />
      <AlertTitle>{statusConfig.label}</AlertTitle>
      <AlertDescription>
        {status === 'pending' && "Your request is under seller review. Seller has 48 hours to respond."}
        {status === 'negotiation' && "Seller has sent a counter offer. Please review and respond."}
        {status === 'approved' && (
          // If payment has completed for an approved refund show a clear message first
          String(refund.refund_payment_status || '').toLowerCase() === 'completed' ? (
            'Your refund payment has been completed.'
          ) : (
            // If the refund is a return item, show specialized messages based on return_request status
            (refund?.refund_category === 'return_item' || (refund as any)?.refund_type === 'return') ? (
              (() => {
                const rr = String(refund.return_request?.status || '').toLowerCase();
                const pay = String(refund.refund_payment_status || '').toLowerCase();
                const rtype = String(refund.refund_type || '').toLowerCase();
                if (rr === 'received') return 'Item has been received by the seller. Seller will inspect the item.';
                if (rr === 'inspected') return 'Item has been inspected by the seller. Seller will accept or reject the return.';
                if (rr === 'shipped') return 'Item has been shipped. Waiting for the seller to receive the item.';
                if (rr === 'approved' && pay === 'processing') return 'Return approved — your refund is currently being processed.';
                if (rr === 'approved' && pay === 'pending') return 'Seller accepted your return request. Waiting for the moderation team to process the refund.';
                // Keep-type refunds that are approved and in 'processing' should show a similar processing message
                if (rtype === 'keep' && pay === 'processing') return 'Your refund is currently being processed.';
                // If buyer already provided shipping info, show an updated message instead of the 'Please return' prompt
                if (refund.return_request?.tracking_number || String(refund.return_request?.status || '').toLowerCase() === 'shipped' || String(refund.return_request?.status || '').toLowerCase() === 'received') {
                  return 'Return shipping information received. Waiting for seller to receive the item.';
                }
                return 'Your return request has been approved! Please return the item to complete your refund.';
              })()
            ) : (
              'Your refund has been approved! Waiting for moderation team to process the refund.'
            )
          )
        )}
        {status === 'to_verify' && "Seller has received the item and is verifying its condition."}
        {status === 'to_process' && "Item verification complete. Seller is processing your refund."}
        {status === 'dispute' && !(dr && String((dr.status || '').trim()).toLowerCase() === 'approved') && "This dispute is under admin review."}
        {status === 'completed' && "Your refund has been successfully completed."}
        {status === 'rejected' && "Your refund request has been rejected by the seller."}
        {status === 'cancelled' && "This refund request has been cancelled."}
      </AlertDescription>
    </Alert>
  );
}

function RejectDialog({ 
  showRejectDialog, 
  setShowRejectDialog, 
  rejectReason, 
  setRejectReason, 
  actionLoading, 
  status, 
  handleAction 
}: { 
  showRejectDialog: boolean;
  setShowRejectDialog: (show: boolean) => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  actionLoading: boolean;
  status: string;
  handleAction: (action: string, data?: any) => Promise<void>;
}) {
  return (
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {status === 'negotiation' ? 'Reject Offer' : 'Cancel Refund Request'}
          </DialogTitle>
          <DialogDescription>
            {status === 'negotiation' 
              ? 'Provide a reason for rejecting the seller\'s offer.'
              : 'Are you sure you want to cancel this refund request?'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              {status === 'negotiation' ? 'Reason for Rejection' : 'Reason for Cancellation'}
            </Label>
            <Textarea
              id="reject-reason"
              placeholder={status === 'negotiation' 
                ? 'Explain why you\'re rejecting this offer...'
                : 'Optional: explain why you\'re cancelling...'}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              {status === 'negotiation'
                ? 'Rejecting this offer may lead to the request being cancelled.'
                : 'Cancelling this request cannot be undone.'}
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (status === 'negotiation') {
                await handleAction('reject_offer', { reason: rejectReason });
              } else {
                await handleAction('cancel');
              }
              setShowRejectDialog(false);
              setRejectReason('');
            }}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : (status === 'negotiation' ? 'Reject Offer' : 'Cancel Request')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrackingDialog({ 
  showTrackingDialog, 
  setShowTrackingDialog, 
  trackingNumber, 
  setTrackingNumber, 
  logisticService, 
  setLogisticService, 
  trackingFiles, 
  setTrackingFiles, 
  actionLoading, 
  refund, 
  user, 
  fetchRefundDetails, 
  setDetailsSubmittedMessage,
  toast 
}: { 
  showTrackingDialog: boolean;
  setShowTrackingDialog: (show: boolean) => void;
  trackingNumber: string;
  setTrackingNumber: (value: string) => void;
  logisticService: string;
  setLogisticService: (value: string) => void;
  trackingFiles: File[];
  setTrackingFiles: (files: File[]) => void;
  actionLoading: boolean;
  refund: RefundDetail;
  user: any;
  fetchRefundDetails: () => Promise<void>;
  setDetailsSubmittedMessage: (message: string | null) => void;
  toast: any;
}) {
  return (
    <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Tracking Information</DialogTitle>
          <DialogDescription>
            Enter your return shipment tracking details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logistic-service">Logistic Service *</Label>
            <Input
              id="logistic-service"
              placeholder="e.g., LBC, J&T Express, Ninja Van"
              value={logisticService}
              onChange={(e) => setLogisticService(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking-number">Tracking Number *</Label>
            <Input
              id="tracking-number"
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-media">Return Media (optional, images only, max 9)</Label>
            <input id="return-media" type="file" accept="image/*" multiple onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              // enforce max 9 images client-side
              const total = (trackingFiles || []).length + files.length;
              if (total > 9) {
                const allowed = 9 - (trackingFiles || []).length;
                const allowedFiles = files.slice(0, Math.max(0, allowed));
                setTrackingFiles([...(trackingFiles || []), ...allowedFiles]);
                // show toast to explain trimmed selection
                toast({ title: 'Notice', description: `Only ${9} images allowed. ${files.length - allowed} file(s) were not added.`, variant: 'destructive' });
              } else {
                setTrackingFiles([...(trackingFiles || []), ...files]);
              }
            }} />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Optional: photos of the package or proof of shipment.</p>
              <p className="text-xs text-gray-500">{trackingFiles.length}/9 selected</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTrackingDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              // Build FormData and send to update_tracking to allow file uploads
              const fd = new FormData();
              fd.append('logistic_service', logisticService);
              fd.append('tracking_number', trackingNumber);
              trackingFiles.forEach((f) => fd.append('media_files', f));

              try {
                await AxiosInstance.post(`/return-refund/${refund.refund_id}/update_tracking/`, fd, {
                  headers: { 'X-User-Id': user?.user_id || '' }
                });
                setShowTrackingDialog(false);
                setLogisticService('');
                setTrackingNumber('');
                setTrackingFiles([]);
                await fetchRefundDetails();
                // transient UI confirmation
                setDetailsSubmittedMessage('Details submitted');
                setTimeout(() => setDetailsSubmittedMessage(null), 5000);
                toast({ title: 'Success', description: 'Return information submitted' });
              } catch (err: any) {
                toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to submit return info', variant: 'destructive' });
              }
            }}
            disabled={!logisticService.trim() || !trackingNumber.trim() || actionLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {actionLoading ? 'Updating...' : 'Update Tracking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisputeDialog({ 
  showDisputeDialog, 
  setShowDisputeDialog, 
  disputeReason, 
  setDisputeReason, 
  disputeFiles,
  setDisputeFiles,
  actionLoading, 
  handleAction 
}: { 
  showDisputeDialog: boolean;
  setShowDisputeDialog: (show: boolean) => void;
  disputeReason: string;
  setDisputeReason: (reason: string) => void;
  disputeFiles: File[];
  setDisputeFiles: (files: File[]) => void;
  actionLoading: boolean;
  handleAction: (action: string, data?: any) => Promise<void>;
}) {
  return (
    <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
          <DialogDescription>
            Explain why you believe the seller's decision was incorrect
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Dispute Reason *</Label>
            <Textarea
              id="dispute-reason"
              placeholder="Explain why you disagree with the seller's decision..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div>
            <Label>Attach Evidence (optional)</Label>
            <input type="file" multiple onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setDisputeFiles(files);
            }} accept="image/*,.pdf,.doc,.docx" />
            {disputeFiles.length > 0 && (
              <div className="text-sm text-gray-600 mt-2">{disputeFiles.length} file(s) selected</div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription className="text-xs">
              Please provide clear reasons and any supporting evidence. False disputes may result in penalties.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await handleAction('file_dispute', { dispute_reason: disputeReason, description: disputeReason, files: disputeFiles });
              setShowDisputeDialog(false);
              setDisputeReason('');
              setDisputeFiles([]);
            }}
            disabled={!disputeReason.trim() || actionLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {actionLoading ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== MAIN COMPONENT ==========

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Refund Request",
    },
  ];
}

export async function loader({ request, context, params }: Route.LoaderArgs): Promise<{ user: UserType; refund: RefundDetail | null }> {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  await requireRole(request, context, ["isCustomer"]);

  const refundId = params.refundId;

  try {
    const response = await AxiosInstance.get(`/return-refund/${refundId}/get_my_refund/`, {
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
      refund: response.data
    };
  } catch (error) {
    console.error('Error fetching refund details:', error);
    return {
      user: user || {
        isAdmin: false,
        isCustomer: true,
        isRider: false,
        isModerator: false,
        user_id: ''
      },
      refund: null
    };
  }
}

export default function ViewReturnRefund({ loaderData }: Route.ComponentProps) {
  const { user, refund: initialRefund } = loaderData;
  const navigate = useNavigate();
  const { refundId } = useParams();
  const { toast } = useToast();
  const [refund, setRefund] = useState<RefundDetail | null>(initialRefund);
  const [loading, setLoading] = useState(!initialRefund);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [logisticService, setLogisticService] = useState('');
  // Files selected in the quick tracking dialog (optional)
  const [trackingFiles, setTrackingFiles] = useState<File[]>([]);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  // UI message shown briefly after buyer submits return info
  const [detailsSubmittedMessage, setDetailsSubmittedMessage] = useState<string | null>(null);

  // Acknowledgement state for dispute 'rejected' flow (moved up from DisputeStatusUI so it can be rendered in the Actions card)
  const [ackLoading, setAckLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledgeDispute = async (dr: any) => {
    if (!dr || !dr.id) return;
    setAckLoading(true);
    try {
      const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const apiPrefix = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
      const ackUrl = `${apiPrefix}/disputes/${encodeURIComponent(String(dr.id))}/acknowledge/`;

      // Helpful debug to diagnose double-/api/ issues reported in logs
      console.debug('Acknowledge dispute URL:', ackUrl);

      const res = await fetch(ackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user?.user_id || ''),
        },
        credentials: 'include',
      });

      if (res.ok) {
        // Parse response and update local refund status if returned by server
        let json: any = null;
        try { json = await res.json(); } catch (_) { json = null; }

        // Server returns DisputeRequestSerializer which includes a limited `refund` field.
        if (json && json.refund) {
          // refresh full refund details from server to reflect canonical state
          await fetchRefundDetails();
          setAcknowledged(true);
          toast({ title: 'Acknowledged', description: 'You have acknowledged the admin decision.', variant: 'success' });
        } else {
          // Server didn't include refund info; treat as acknowledged and mark locally
          setAcknowledged(true);
          toast({ title: 'Acknowledged', description: 'You have acknowledged the admin decision.', variant: 'success' });

          // Fallback: mark completed locally so UI reflects the acknowledged state *and* mark dispute resolved if present
          setRefund((prev) => {
            if (!prev) return prev;
            const dr = (prev as any).dispute || (prev as any).dispute_request || null;
            let updatedRefund: any = { ...(prev as any), status: 'completed', refund_payment_status: 'completed' };
            if (dr) {
              const resolvedDr = { ...(dr as any), status: 'resolved', resolved_at: new Date().toISOString() };
              updatedRefund.dispute = resolvedDr;
              updatedRefund.dispute_request = resolvedDr;
            }
            console.debug('Locally updated refund after acknowledge fallback:', updatedRefund);
            return updatedRefund as RefundDetail;
          });
        }
      } else if (res.status === 404 || res.status === 405) {
        // Server doesn't implement acknowledge — fallback to local ack
        toast({ title: 'Acknowledged', description: 'Acknowledged locally (server did not support acknowledge).', variant: 'default' });
        setAcknowledged(true);
        // Also locally mark as completed (do not change payment status) and mark dispute resolved if present
        setRefund((prev) => {
          if (!prev) return prev;
          const dr = (prev as any).dispute || (prev as any).dispute_request || null;
          let updatedRefund: any = { ...(prev as any), status: 'completed', refund_payment_status: 'completed' };
          if (dr) {
            const resolvedDr = { ...(dr as any), status: 'resolved', resolved_at: new Date().toISOString() };
            updatedRefund.dispute = resolvedDr;
            updatedRefund.dispute_request = resolvedDr;
          }
          console.debug('Locally updated refund after 404/405 acknowledge fallback:', updatedRefund);
          return updatedRefund as RefundDetail;
        });
      } else {
        let msg = 'Failed to acknowledge';
        try { const j = await res.json(); msg = j?.error || j?.detail || msg; } catch (_) {}
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Network error', variant: 'destructive' });
    } finally {
      setAckLoading(false);
    }
  };

  // Buyer accept-flow states: preview confirmation and add-account dialog
  const [showAcceptPreview, setShowAcceptPreview] = useState(false);
  const [acceptPreviewData, setAcceptPreviewData] = useState<any>(null);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [newAccountMethod, setNewAccountMethod] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState<any>({});
  const [isAccepting, setIsAccepting] = useState(false);

  const status = String(refund?.status || 'pending').toLowerCase().trim();
  // Only treat explicit 'waiting' status as waiting UI; keep 'approved' as approved even after buyer provides tracking
  const isWaitingDerived = (status === 'waiting');
  const statusForConfig = isWaitingDerived ? 'to_ship' : status;
  const statusConfig = STATUS_CONFIG[statusForConfig] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleAction = async (action: string, data?: any) => {
    if (!refund?.refund_id) return;

    try {
      setActionLoading(true);
      let endpoint = '';
      let method = 'POST';
      let body: any = null;

      switch (action) {
        case 'cancel':
          endpoint = `/return-refund/${refund.refund_id}/cancel_refund/`;
          break;
        case 'respond_to_negotiation':
          endpoint = `/return-refund/${refund.refund_id}/respond_to_negotiation/`;
          body = data;
          break;
        case 'start_return_process':
          endpoint = `/return-refund/${refund.refund_id}/start_return_process/`;
          break;
        case 'update_tracking':
          endpoint = `/return-refund/${refund.refund_id}/update_tracking/`;
          body = data;
          break;
        case 'file_dispute':
          endpoint = `/return-refund/${refund.refund_id}/file_dispute/`;
          // Support file uploads via FormData when `data.files` is provided
          if (data && data.files && Array.isArray(data.files)) {
            const fd = new FormData();
            if (data.dispute_reason) fd.append('dispute_reason', data.dispute_reason);
            if (data.description) fd.append('description', data.description);
            data.files.forEach((f: File, idx: number) => fd.append('file', f));
            body = fd;
          } else {
            body = data;
          }
          break;
        case 'contact_seller':
          if (refund.shop?.id) {
            navigate(`/shop/${refund.shop.id}`);
          }
          return;
        case 'accept_offer':
          endpoint = `/return-refund/${refund.refund_id}/respond_to_negotiation/`;
          body = { action: 'accept', reason: data?.reason || '' };
          break;
        case 'reject_offer':
          endpoint = `/return-refund/${refund.refund_id}/respond_to_negotiation/`;
          body = { action: 'reject', reason: data?.reason || '' };
          break;
        default:
          console.warn('Unknown action:', action);
          return;
      }

      const response = await AxiosInstance({
        method,
        url: endpoint,
        data: body,
        headers: {
          'X-User-Id': user?.user_id || ''
        }
      });

      if (response.status === 200 || response.status === 201) {
        toast({
          title: 'Success',
          description: 'Action completed successfully',
        });
        await fetchRefundDetails();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to complete action',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchRefundDetails = async () => {
    if (!refundId) return;

    try {
      const response = await AxiosInstance.get(`/return-refund/${refundId}/get_my_refund/`, {
        headers: {
          'X-User-Id': user?.user_id || ''
        }
      });

      setRefund(response.data);
    } catch (error) {
      console.error('Error fetching refund details:', error);
    }
  };

  useEffect(() => {
    if (!initialRefund && refundId) {
      fetchRefundDetails();
    }
  }, [initialRefund, refundId]);

  // Helper: parse seller method (supports values like 'wallet' or 'return:wallet')
  function parseMethodFromRefund(r: RefundDetail | null) {
    const latestCounter = (r && r.counter_requests && r.counter_requests.length > 0) ? r.counter_requests[0] : null;
    const raw = (r && (r as any).seller_suggested_method) || latestCounter?.counter_refund_method || (r && r.buyer_preferred_refund_method) || '';
    if (!raw) return '';
    const parts = String(raw).split(':').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    // method usually in second part; fallback to first
    return parts.length === 1 ? parts[0].toLowerCase() : parts[1].toLowerCase();
  }

  // Check whether there is saved payment detail for a given method
  function hasPaymentDetailForMethod(r: RefundDetail | null, method: string) {
    if (!r || !method) return false;
    const pd = (r as any).payment_details || {};
    switch (method) {
      case 'wallet':
        return Boolean(pd.wallet && (pd.wallet.account_number || pd.wallet.wallet_id || pd.wallet.provider));
      case 'bank':
        return Boolean(pd.bank && (pd.bank.account_number || pd.bank.bank_name));
      case 'remittance':
        return Boolean(pd.remittance && (pd.remittance.reference || pd.remittance.receiver_name || pd.remittance.provider));
      default:
        return true; // voucher or other methods don't require account
    }
  }

  const handleAcceptClick = async () => {
    if (!refund) return;
    const method = parseMethodFromRefund(refund);

    // If method does not need account (e.g., voucher), proceed to confirm
    if (method === 'voucher' || !method) {
      // directly accept
      setIsAccepting(true);
      try {
        await handleAction('accept_offer', { reason: 'Accepted seller offer' });
      } finally {
        setIsAccepting(false);
      }
      return;
    }

    // Check if buyer has a saved account for this method
    if (hasPaymentDetailForMethod(refund, method)) {
      // Show preview modal with existing account
      const pd = (refund as any).payment_details || {};
      let preview = null;
      if (method === 'wallet') preview = pd.wallet || null;
      if (method === 'bank') preview = pd.bank || null;
      if (method === 'remittance') preview = pd.remittance || null;
      setAcceptPreviewData({ method, preview });
      setShowAcceptPreview(true);
      return;
    }

    // No saved account: ask buyer to provide one
    setNewAccountMethod(method);
    setAccountForm({});
    setShowAddAccountDialog(true);
    setTimeout(() => {
      toast({ title: 'Account required', description: 'You do not have an account provided for this method. Please add account details to continue.', variant: 'destructive' });
    }, 80);
  };

  // Submit a new user payment method (simple add) and then show preview/confirm
  const handleAddAccountSubmit = async () => {
    if (!newAccountMethod) return;
    setAddingAccount(true);
    try {
      const payload: any = { method_type: newAccountMethod };
      // map fields conservatively
      if (newAccountMethod === 'wallet') {
        payload.provider = accountForm.provider || '';
        payload.account_number = accountForm.account_number || accountForm.wallet_id || '';
        payload.account_name = accountForm.account_name || '';
        payload.contact_number = accountForm.contact_number || '';
      } else if (newAccountMethod === 'bank') {
        payload.bank_name = accountForm.bank_name || '';
        payload.account_number = accountForm.account_number || '';
        payload.account_name = accountForm.account_name || '';
        payload.account_type = accountForm.account_type || '';
        payload.branch = accountForm.branch || '';
      } else if (newAccountMethod === 'remittance') {
        payload.provider = accountForm.provider || '';
        payload.first_name = accountForm.first_name || '';
        payload.middle_name = accountForm.middle_name || '';
        payload.last_name = accountForm.last_name || '';
        payload.reference = accountForm.reference || '';
        payload.account_number = accountForm.account_number || accountForm.reference || '';
        payload.contact_number = accountForm.contact_number || '';
        payload.country = accountForm.country || '';
        payload.city = accountForm.city || '';
        payload.province = accountForm.province || '';
        payload.zip_code = accountForm.zip_code || '';
        payload.barangay = accountForm.barangay || '';
        payload.street = accountForm.street || '';
        payload.valid_id_type = accountForm.valid_id_type || '';
        payload.valid_id_number = accountForm.valid_id_number || '';
      }

      // Call refund-specific endpoint to save account details for this refund
      const resp = await AxiosInstance.post(`/return-refund/${refund?.refund_id}/add_refund_payment_detail/`, { ...payload, method: newAccountMethod }, { headers: { 'X-User-Id': user?.user_id || '' } });
      if (resp.status === 200 || resp.status === 201) {
        // refresh refund details to pick up new payment info
        await fetchRefundDetails();
        setShowAddAccountDialog(false);
        // show preview after adding
        setTimeout(() => {
          setAcceptPreviewData({ method: newAccountMethod, preview: null });
          setShowAcceptPreview(true);
        }, 150);
        toast({ title: 'Saved', description: 'Payment method saved. Please confirm to accept the offer.' });
      } else {
        throw new Error('Failed to save account');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.error || err?.message || 'Failed to save account', variant: 'destructive' });
    } finally {
      setAddingAccount(false);
    }
  };

  const handleConfirmAccept = async () => {
    setShowAcceptPreview(false);
    setIsAccepting(true);
    try {
      await handleAction('accept_offer', { reason: 'Accepted seller offer' });
    } finally {
      setIsAccepting(false);
    }
  };

  // Add dialogs: AcceptPreview and AddAccountDialog
  function AcceptPreviewDialog() {
    const data = acceptPreviewData || {};
    const method = data.method || '';
    const preview = data.preview || ((refund as any).payment_details ? ((refund as any).payment_details[method] || null) : null);

    return (
      <Dialog open={showAcceptPreview} onOpenChange={setShowAcceptPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Accept</DialogTitle>
            <DialogDescription>Review your account details for refund before confirming.</DialogDescription>
          </DialogHeader>

          <div className="mt-3">
            {preview ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-500">Method</div>
                <div className="font-medium">{method}</div>
                <div className="mt-2 text-sm text-gray-500">Account details</div>
                <div className="p-3 bg-gray-50 rounded">
                  {method === 'wallet' && (
                    <div>
                      <div className="font-medium">{preview.provider || preview.wallet_provider || '—'}</div>
                      <div className="text-sm">{preview.account_number || preview.wallet_id || '—'}</div>
                      <div className="text-sm text-gray-600">{preview.account_name || preview.owner_name || ''}</div>
                    </div>
                  )}

                  {method === 'bank' && (
                    <div>
                      <div className="font-medium">{preview.bank_name || preview.name || '—'}</div>
                      <div className="text-sm">{preview.account_number || '—'}</div>
                      <div className="text-sm text-gray-600">{preview.account_name || ''}</div>
                    </div>
                  )}

                  {method === 'remittance' && (
                    <div>
                      <div className="font-medium">{preview.provider || preview.service || '—'}</div>
                      <div className="text-sm">{preview.reference || preview.account || '—'}</div>
                      <div className="text-sm text-gray-600">{preview.receiver_name || `${preview.first_name || ''} ${preview.last_name || ''}`}</div>
                    </div>
                  )}

                  {!preview && (
                    <div className="text-sm text-gray-600">No preview available.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No account details available to preview.</div>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowAcceptPreview(false)}>Cancel</Button>
              <Button className="w-full sm:w-auto bg-green-600" onClick={handleConfirmAccept}>Confirm & Accept</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function AddAccountDialog() {
    // Helper to validate required fields per method
    const validate = (method: string | null, form: any) => {
      const missing: string[] = [];
      if (!method) {
        missing.push('method');
        return { ok: false, missing };
      }
      if (method === 'wallet') {
        if (!form.provider || !String(form.provider).trim()) missing.push('Provider');
        if (!form.account_number || !String(form.account_number).trim()) missing.push('Wallet ID / Account Number');
      } else if (method === 'bank') {
        if (!form.bank_name || !String(form.bank_name).trim()) missing.push('Bank Name');
        if (!form.account_number || !String(form.account_number).trim()) missing.push('Account Number');
        if (!form.account_name || !String(form.account_name).trim()) missing.push('Account Name');
      } else if (method === 'remittance') {
        if (!form.provider || !String(form.provider).trim()) missing.push('Service Provider');
        if (!form.first_name || !String(form.first_name).trim()) missing.push('Receiver First Name');
        if (!form.last_name || !String(form.last_name).trim()) missing.push('Receiver Last Name');
        if (!form.reference && !form.account_number) missing.push('Reference / Account');
        if (!form.contact_number || !String(form.contact_number).trim()) missing.push('Contact Number');
      }
      return { ok: missing.length === 0, missing };
    };

    const validated = validate(newAccountMethod, accountForm);

    return (
      <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Account for Refund</DialogTitle>
            <DialogDescription>Please provide account details so seller can process refunds to this account. Fields marked * are required.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-sm">Refund Method</Label>
              <select value={newAccountMethod || ''} onChange={(e) => { if (!newAccountMethod) { setNewAccountMethod(e.target.value || null); setAccountForm({}); } }} className="mt-1 block w-full rounded-md border p-2" disabled={Boolean(newAccountMethod)}>
                <option value="">Select a method</option>
                <option value="wallet">E-Wallet</option>
                <option value="bank">Bank Transfer</option>
                <option value="remittance">Remittance</option>
              </select>
              {newAccountMethod && (
                <div className="text-xs text-gray-500 mt-1">Method preselected from seller's offer: <strong>{newAccountMethod}</strong></div>
              )}
            </div>

            {newAccountMethod === 'wallet' && (
              <div>
                <Label>E-Wallet Provider *</Label>
                <Input value={accountForm.provider || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, provider: e.target.value }))} placeholder="Provider (e.g., GCash)" />
                <Label className="mt-2">Wallet ID / Account Number *</Label>
                <Input value={accountForm.account_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_number: e.target.value }))} placeholder="1111-2222-3333" />
                <Label className="mt-2">Account Name</Label>
                <Input value={accountForm.account_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_name: e.target.value }))} placeholder="Full name" />
                <Label className="mt-2">Contact Number</Label>
                <Input value={accountForm.contact_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, contact_number: e.target.value }))} placeholder="09171234567" />
              </div>
            )}

            {newAccountMethod === 'bank' && (
              <div>
                <Label>Bank Name *</Label>
                <Input value={accountForm.bank_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, bank_name: e.target.value }))} placeholder="Bank" />
                <Label className="mt-2">Account Number *</Label>
                <Input value={accountForm.account_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_number: e.target.value }))} placeholder="1234567890" />
                <Label className="mt-2">Account Name *</Label>
                <Input value={accountForm.account_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_name: e.target.value }))} placeholder="Full name" />
                <Label className="mt-2">Account Type (optional)</Label>
                <Input value={accountForm.account_type || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, account_type: e.target.value }))} placeholder="savings / checking" />
                <Label className="mt-2">Branch (optional)</Label>
                <Input value={accountForm.branch || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, branch: e.target.value }))} placeholder="Branch" />
              </div>
            )}

            {newAccountMethod === 'remittance' && (
              <div>
                <Label>Service Provider *</Label>
                <Input value={accountForm.provider || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, provider: e.target.value }))} placeholder="Provider (e.g., Western Union)" />
                <Label className="mt-2">Receiver First Name *</Label>
                <Input value={accountForm.first_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                <Label className="mt-2">Receiver Middle Name</Label>
                <Input value={accountForm.middle_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, middle_name: e.target.value }))} placeholder="Middle name (optional)" />
                <Label className="mt-2">Receiver Last Name *</Label>
                <Input value={accountForm.last_name || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                <Label className="mt-2">Reference / Account *</Label>
                <Input value={accountForm.reference || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, reference: e.target.value }))} placeholder="Reference or account" />
                <Label className="mt-2">Contact Number *</Label>
                <Input value={accountForm.contact_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, contact_number: e.target.value }))} placeholder="09171234567" />
                <Label className="mt-2">Address (street)</Label>
                <Input value={accountForm.street || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, street: e.target.value }))} placeholder="Street" />
                <Label className="mt-2">Barangay</Label>
                <Input value={accountForm.barangay || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, barangay: e.target.value }))} placeholder="Barangay" />
                <Label className="mt-2">City</Label>
                <Input value={accountForm.city || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, city: e.target.value }))} placeholder="City" />
                <Label className="mt-2">Province</Label>
                <Input value={accountForm.province || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, province: e.target.value }))} placeholder="Province" />
                <Label className="mt-2">Zip Code</Label>
                <Input value={accountForm.zip_code || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, zip_code: e.target.value }))} placeholder="Zip code" />
                <Label className="mt-2">Country</Label>
                <Input value={accountForm.country || 'Philippines'} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, country: e.target.value }))} placeholder="Country" />
                <Label className="mt-2">Valid ID Type</Label>
                <Input value={accountForm.valid_id_type || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, valid_id_type: e.target.value }))} placeholder="Valid ID Type (optional)" />
                <Label className="mt-2">Valid ID Number</Label>
                <Input value={accountForm.valid_id_number || ''} onChange={(e: any) => setAccountForm((p: any) => ({ ...p, valid_id_number: e.target.value }))} placeholder="ID number (optional)" />
              </div>
            )}

            {!validated.ok && validated.missing.length > 0 && (
              <div className="text-sm text-red-600">Required: {validated.missing.join(', ')}</div>
            )}

          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowAddAccountDialog(false)}>Cancel</Button>
              <Button className="w-full sm:w-auto bg-blue-600" onClick={async () => {
                const v = validate(newAccountMethod, accountForm);
                if (!v.ok) { toast({ title: 'Validation', description: `Please fill: ${v.missing.join(', ')}`, variant: 'destructive' }); return; }
                await handleAddAccountSubmit();
              }} disabled={addingAccount || !validated.ok}>{addingAccount ? 'Saving...' : 'Save & Continue'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // end of added dialogs and helpers

  useEffect(() => {
    if (!refund || !refund.refund_id) return;
    
    const terminal = ['completed', 'rejected', 'cancelled'];
    const s = String(refund.status || '').toLowerCase();

    if (terminal.includes(s)) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      fetchRefundDetails();
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [refund?.refund_id, refund?.status]);

  const renderStatusUI = () => {
    if (!refund) return null;

    const submitReturnInfo = async (formData: FormData) => {
      if (!refund?.refund_id) return false;
      try {
        setActionLoading(true);

        if (!refund.return_request) {
          await AxiosInstance.post(`/return-refund/${refund.refund_id}/start_return_process/`, {}, {
            headers: { 'X-User-Id': user?.user_id || '' }
          });
        }

        await AxiosInstance.post(`/return-refund/${refund.refund_id}/update_tracking/`, formData, {
          headers: { 'X-User-Id': user?.user_id || '' }
        });

        await fetchRefundDetails();

        // transient UI confirmation
        setDetailsSubmittedMessage('Details submitted');
        setTimeout(() => setDetailsSubmittedMessage(null), 5000);

        return true;
      } catch (error: any) {
        console.error('Failed to submit return info', error);
        return false;
      } finally {
        setActionLoading(false);
      }
    };

    if (isWaitingDerived) return <WaitingStatusUI refund={refund} onOpenTrackingDialog={() => setShowTrackingDialog(true)} actionLoading={actionLoading} onSubmitReturn={submitReturnInfo} detailsSubmittedMessage={detailsSubmittedMessage} />;

    switch (status) {
      case 'pending':
        return <PendingStatusUI refund={refund} />;
      case 'negotiation':
        return <NegotiationStatusUI refund={refund} formatDate={formatDate} formatCurrency={formatCurrency} />;
      case 'approved':
        return <ApprovedStatusUI refund={refund} onOpenTrackingDialog={() => setShowTrackingDialog(true)} formatCurrency={formatCurrency} />;
      case 'to_verify':
        return <ToVerifyStatusUI />;
      case 'to_process':
        return <ToProcessStatusUI refund={refund} formatCurrency={formatCurrency} />;
      case 'dispute':
        return <DisputeStatusUI refund={refund} formatCurrency={formatCurrency} user={user} />;
      case 'completed':
        // Only show completed UI if there is no active dispute, or the dispute has been resolved
        const drCompleted = (refund as any).dispute || (refund as any).dispute_request || null;
        if (drCompleted && String((drCompleted.status || '').trim()).toLowerCase() !== 'resolved') {
          // If a dispute exists and isn't resolved, show dispute UI instead of completed
          return <DisputeStatusUI refund={refund} formatCurrency={formatCurrency} user={user} />;
        }
        return <CompletedStatusUI refund={refund} formatCurrency={formatCurrency} />;
      case 'rejected':
        return <RejectedStatusUI refund={refund} formatCurrency={formatCurrency} />;
      case 'cancelled':
        return <CancelledStatusUI />;
      default:
        return <PendingStatusUI refund={refund} />;
    }
  };

  const renderStatusActions = () => {
    if (!refund) return null;

    // Consider explicit 'waiting' as the special waiting UI; show Add/Update Tracking action for approved return refunds as well
    const isWaitingDerived = (status === 'waiting');
    const rrStatus = String(refund?.return_request?.status || '').toLowerCase();
    const payStatus = String(refund?.refund_payment_status || '').toLowerCase();
    // Hide add-tracking action when a dispute was approved by admin (we don't want buyer to ship items after admin ruled in buyer's favor)
    const dr = (refund as any).dispute || (refund as any).dispute_request || null;
    // Show Add/Update Tracking action only when refund is approved and the return hasn't moved to shipped/received/inspected
    // Also hide the action when the return is approved but the refund payment is processing or already completed
    const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
    const isReturnAcceptedWaitingModeration = rrStatus === 'approved' && String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
    const showAddTrackingAction = ((status === 'approved' && (refund?.refund_category === 'return_item' || (refund as any)?.refund_type === 'return') && !['shipped','received','inspected'].includes(rrStatus) && !(rrStatus === 'approved' && ['processing','completed'].includes(payStatus)) && !(dr && String(dr.status || '').toLowerCase() === 'approved') && !isReturnAcceptedWaitingModeration)) || isWaitingDerived;

    if (showAddTrackingAction) {
      return (
        <>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowTrackingDialog(true)}
            disabled={actionLoading}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            {refund?.tracking_number ? 'Update Shipping Info' : 'Provide Shipping Info'}
          </Button>
        </>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowRejectDialog(true)}
            disabled={actionLoading}
            size="sm"
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancel Request
          </Button>
        );
      case 'negotiation':
        return (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => handleAcceptClick()}
              disabled={actionLoading || isAccepting}
              size="sm"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Accept Offer
            </Button>
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowRejectDialog(true)}
              disabled={actionLoading}
              size="sm"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Reject Offer
            </Button>
          </>
        );
      case 'rejected':
        // If the latest counter was rejected, explicitly allow filing a dispute
        const latestCounter = (refund && refund.counter_requests && refund.counter_requests.length > 0) ? refund.counter_requests[0] : null;

        return (
          <div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                // Prefill dispute reason with latest counter details if available
                const latestCounter = (refund && refund.counter_requests && refund.counter_requests.length > 0) ? refund.counter_requests[0] : null;
                if (latestCounter && latestCounter.status === 'rejected') {
                  const amt = latestCounter.counter_refund_amount != null ? formatCurrency(latestCounter.counter_refund_amount) : null;
                  const mRaw = latestCounter.counter_refund_method || '';
                  const method = mRaw && mRaw.indexOf(':') !== -1 ? mRaw.split(':').pop() : mRaw;
                  setDisputeReason(`I rejected the seller's counter-offer${amt ? ` of ${amt}` : ''}${method ? ` via ${method}` : ''} and would like to escalate this case.`);
                } else {
                  setDisputeReason('');
                }
                setShowDisputeDialog(true);
              }}
              disabled={actionLoading}
              size="sm"
            >
              <ShieldAlert className="h-4 w-4 mr-2" />
              File a Dispute
            </Button>
            {latestCounter && latestCounter.status === 'rejected' && (
              <p className="text-xs text-gray-500 mt-2">A seller counter-offer was rejected — you may file a dispute to escalate this case.</p>
            )}
          </div>
        );
      case 'dispute':
        // Render actions when a dispute was processed by admin
        const dr = (refund as any).dispute || (refund as any).dispute_request || null;

        if (dr && String((dr.status || '').trim()).toLowerCase() === 'rejected' && String(refund.status || '').toLowerCase() === 'dispute') {
          return (
            <div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => handleAcknowledgeDispute(dr)}
                disabled={ackLoading || acknowledged}
                size="sm"
              >
                {ackLoading ? 'Confirming…' : (acknowledged ? 'Acknowledged' : 'Confirm')}
              </Button>

              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => window.alert('Contact support')}
                size="sm"
              >
                Contact Support
              </Button>
            </div>
          );
        }

        return (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/return-refund')}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        );
      default:
        return (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/return-refund')}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-40 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-40 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

  if (!refund) {
    return (
      <UserProvider user={user}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Refund Not Found</AlertTitle>
            <AlertDescription>The refund request you're looking for doesn't exist.</AlertDescription>
          </Alert>
        </div>
      </UserProvider>
    );
  }

  return (
    <UserProvider user={user}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <HeaderSection 
          refund={refund} 
          statusConfig={statusConfig} 
          StatusIcon={StatusIcon} 
          navigate={navigate} 
        />

        <Separator className="mb-6" />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status Alert */}
            <StatusAlertSection refund={refund} statusConfig={statusConfig} StatusIcon={StatusIcon} />

            {/* Status-specific UI */}
            {renderStatusUI()}

            {/* Collapsible Sections */}
            <OrderItemsSection refund={refund} />
            <CustomerDetailsSection refund={refund} />
            <EvidenceSection refund={refund} />
          </div>

          {/* Right Column - Actions & Summary */}
          <div className="space-y-4">
            {/* Actions Card */}
            <ActionsSection 
              renderStatusActions={renderStatusActions} 
              refund={refund} 
              navigate={navigate} 
            />

            {/* Shop Info Card */}
            <ShopInfoSection refund={refund} navigate={navigate} />

            {/* Timeline Card */}
            <TimelineSection statusConfig={statusConfig} />
          </div>
        </div>

        {/* Dialogs */}
        <RejectDialog 
          showRejectDialog={showRejectDialog}
          setShowRejectDialog={setShowRejectDialog}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          actionLoading={actionLoading}
          status={status}
          handleAction={handleAction}
        />

        <TrackingDialog
          showTrackingDialog={showTrackingDialog}
          setShowTrackingDialog={setShowTrackingDialog}
          trackingNumber={trackingNumber}
          setTrackingNumber={setTrackingNumber}
          logisticService={logisticService}
          setLogisticService={setLogisticService}
          trackingFiles={trackingFiles}
          setTrackingFiles={setTrackingFiles}
          actionLoading={actionLoading}
          refund={refund}
          user={user}
          fetchRefundDetails={fetchRefundDetails}
          setDetailsSubmittedMessage={setDetailsSubmittedMessage}
          toast={toast}
        />

        <DisputeDialog
          showDisputeDialog={showDisputeDialog}
          setShowDisputeDialog={setShowDisputeDialog}
          disputeReason={disputeReason}
          setDisputeReason={setDisputeReason}
          disputeFiles={disputeFiles}
          setDisputeFiles={setDisputeFiles}
          actionLoading={actionLoading}
          handleAction={handleAction}
        />

        {/* Accept preview and Add-Account Dialogs */}
        <AcceptPreviewDialogComponent open={showAcceptPreview} onOpenChange={setShowAcceptPreview} method={acceptPreviewData?.method || null} preview={acceptPreviewData?.preview || null} onConfirm={handleConfirmAccept} />
        <AddAccountDialogComponent open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} preselectedMethod={newAccountMethod} accountForm={accountForm} setAccountForm={setAccountForm} addingAccount={addingAccount} onSubmit={handleAddAccountSubmit} />
      </div>
    </UserProvider>
  );
}