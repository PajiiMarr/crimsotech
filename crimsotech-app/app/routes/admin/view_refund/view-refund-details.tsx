"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert';
import { useToast } from '~/hooks/use-toast';
import AxiosInstance from '~/components/axios/Axios';
import { 
  ArrowLeft, CheckCircle, XCircle, Eye, AlertTriangle, Package, 
  PackageCheck, Truck, Clock, MessageCircle, User, Wallet, 
  Calendar, RefreshCw, CheckSquare, ShieldAlert, Ban, 
  FileText, ShoppingBag, CreditCard, DollarSign, Shield, Camera, Upload,
  Scale, Gavel, Search, Loader2, Send, AlertCircle
} from 'lucide-react';

// Minimal shape matching what `/admin-refunds/refund_list/` returns
interface RefundFlat {
  refund: string;
  order_id?: string;
  order_total_amount?: number;
  requested_by_username?: string;
  requested_by_email?: string;
  processed_by_username?: string | null;
  processed_by_email?: string | null;
  reason?: string | null;
  requested_refund_amount?: number | null;
  refund_fee?: number | null;
  total_refund_amount?: number | null;
  status?: string;
  requested_at?: string | null;
  processed_at?: string | null;
  logistic_service?: string | null;
  tracking_number?: string | null;
  preferred_refund_method?: string | null;
  final_refund_method?: string | null;
  final_refund_type?: string | null;
  refund_type?: string | null;
  refund_category?: string | null;
  refund_payment_status?: string | null;
  customer_note?: string | null;
  notes?: string | null;
  has_media?: boolean;
  media_count?: number;
  negotiation_offers?: any[];
  dispute_reason?: string | null;
  cancelled_reason?: string | null;
  dispute_details?: any;
  dispute_request?: {
    id?: string;
    status?: string;
    reason?: string;
    case_category?: string | string[];
    case_liability?: string | string[];
    admin_notes?: string;
  } | null;
  // Return request details (optional) — serialized from admin refund_list
  return_request?: {
    id?: string | null;
    status?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    logistic_service?: string | null;
    shipped_at?: string | null;
    received_at?: string | null;
    return_deadline?: string | null;
    notes?: string | null;
    // compatibility aliases used in UI
    medias?: any[];
    media?: any[];
    estimated_delivery?: string | null;
    receipt_notes?: string | null;
    inspection_deadline?: string | null;
    inspection_result?: string | null;
    inspection_notes?: string | null;
  } | null;
} 

// ===== LIABILITY LABELS MAPPING =====
const liabilityLabels: Record<string, string> = {
  'merchant_fulfillment_issue': 'Merchant Fulfillment Issue (Seller)',
  'logistics_delivery_issue': 'Logistics / Delivery Issue (Delivery Partner)',
  'customer_related_issue': 'Customer-Related Issue (Customer)',
  'shared_responsibility': 'Shared Responsibility',
  'platform_system_issue': 'Platform / System Issue'
};

// Helper to format case categories
function formatCaseCategory(category: any): string {
  if (!category) return '';
  if (Array.isArray(category)) {
    return category.map(c => {
      if (typeof c === 'object' && c !== null) {
        return liabilityLabels[c.id] || c.label || c.id || '';
      }
      return liabilityLabels[c] || c.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }).filter(Boolean).join(', ');
  }
  if (typeof category === 'string') {
    if (category.includes(',')) {
      return category.split(',').map(c => c.trim()).filter(Boolean).map(c => liabilityLabels[c] || c.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')).join(', ');
    }
    return liabilityLabels[category] || category.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  return '';
}

// ===== SIMPLIFIED STATUS CONFIGURATION =====
const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: Clock,
    description: 'Seller needs to review this refund request',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: MessageCircle,
    description: 'Active negotiation between buyer and seller',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
    description: 'Refund has been approved',
  },
  waiting: {
    label: 'Waiting',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Package,
    description: 'Waiting for return shipment',
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Truck,
    description: 'Return item in transit',
  },
  received: {
    label: 'Received',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: PackageCheck,
    description: 'Item received by seller',
  },
  to_verify: {
    label: 'To Verify',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: PackageCheck,
    description: 'Item received, needs inspection',
  },
  inspected: {
    label: 'Inspected',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: CheckSquare,
    description: 'Item inspection complete',
  },
  to_process: {
    label: 'To Process',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: RefreshCw,
    description: 'Ready for refund processing',
  },
  dispute: {
    label: 'Dispute',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: ShieldAlert,
    description: 'Dispute filed, awaiting admin review',
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Scale,
    description: 'Admin is currently reviewing the dispute',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckSquare,
    description: 'Return and refund completed',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    description: 'Request rejected',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Ban,
    description: 'Request cancelled',
  }
};

// ===== SIMPLIFIED STATUS UI COMPONENTS =====

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1 text-xs px-2 py-0.5`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Base component for all status displays
function BaseStatusUI({ 
  status, 
  refund 
}: { 
  status: keyof typeof statusConfig, 
  refund: RefundFlat & { [key: string]: any } 
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={`${config.color} border rounded-md p-3`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground mx-1">•</span>
        <span className="text-xs">{config.description}</span>
      </div>
      
      {/* Optional: Show additional context for specific statuses */}
      {status === 'pending' && refund.requested_at && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-yellow-200 pt-2">
          Requested: {new Date(refund.requested_at).toLocaleDateString()}
        </div>
      )}
      
      {status === 'dispute' && refund.dispute_reason && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-orange-200 pt-2">
          Reason: {refund.dispute_reason}
        </div>
      )}
      
      {status === 'under_review' && refund.dispute_reason && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-purple-200 pt-2">
          Dispute Reason: {refund.dispute_reason}
        </div>
      )}
      
      {status === 'waiting' && refund.return_request?.tracking_number && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-indigo-200 pt-2">
          Tracking: {refund.return_request.tracking_number}
        </div>
      )}
      
      {status === 'shipped' && refund.return_request?.shipped_at && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-blue-200 pt-2">
          Shipped: {new Date(refund.return_request.shipped_at).toLocaleDateString()}
        </div>
      )}
      
      {status === 'received' && refund.return_request?.received_at && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-green-200 pt-2">
          Received: {new Date(refund.return_request.received_at).toLocaleDateString()}
        </div>
      )}
      
      {status === 'to_process' && refund.total_refund_amount && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-purple-200 pt-2">
          Amount: ₱{Number(refund.total_refund_amount).toLocaleString()}
        </div>
      )}
      
      {status === 'completed' && refund.processed_at && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-emerald-200 pt-2">
          Completed: {new Date(refund.processed_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// Individual status components (using the base component)
function PendingStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="pending" refund={refund} />;
}

function NegotiationStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="negotiation" refund={refund} />;
}
function ApprovedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const hasDispute = refund.dispute_request || refund.dispute_details;
  
  return (
    <div className="space-y-3">
      <BaseStatusUI status="approved" refund={refund} />
      
      {/* Show liability info if there was a dispute */}
      {hasDispute && refund.dispute_request?.case_category && (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Liability Determination</span>
          </div>
          <div className="text-xs text-purple-600">
            <span className="font-medium">Case Category:</span>{' '}
            {Array.isArray(refund.dispute_request.case_category)
              ? refund.dispute_request.case_category.map((cc: string) => (
                  liabilityLabels[cc] || cc.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                )).join(', ')
              : (refund.dispute_request.case_category?.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' '))}
          </div>
          {refund.dispute_request.admin_notes && (
            <div className="text-xs text-purple-600 mt-1">
              <span className="font-medium">Notes:</span> {refund.dispute_request.admin_notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WaitingStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="waiting" refund={refund} />;
}

function ShippedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="shipped" refund={refund} />;
}

function ReceivedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="received" refund={refund} />;
}

function ToVerifyStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="to_verify" refund={refund} />;
}

function InspectedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="inspected" refund={refund} />;
}

function ToProcessStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="to_process" refund={refund} />;
}

function DisputeStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="dispute" refund={refund} />;
}

function UnderReviewStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="under_review" refund={refund} />;
}

function CompletedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="completed" refund={refund} />;
}

function RejectedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="rejected" refund={refund} />;
}

function CancelledStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  return <BaseStatusUI status="cancelled" refund={refund} />;
}

// ===== PROCESSING UI COMPONENT (Split options removed) =====
// ===== PROCESSING UI COMPONENT (Shows buyer's payment details) =====
// ===== PROCESSING UI COMPONENT (Shows buyer's payment details if available) =====
function ProcessingUI({ 
  refund, 
  onComplete, 
  onCancel, 
  user, 
  setRefund
}: { 
  refund: RefundFlat & { [key: string]: any },
  onComplete: () => void,
  onCancel: () => void,
  user: { id: string | number; isAdmin: boolean },
  setRefund: (value: RefundFlat & { [key: string]: any } | ((prev: RefundFlat & { [key: string]: any }) => RefundFlat & { [key: string]: any })) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Proof upload states
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Format money utility
  const formatMoney = (value: unknown) => {
    try {
      const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
      if (!Number.isFinite(num)) return '—';
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
    } catch {
      return '—';
    }
  };

  // Get refund method icon
  const getMethodIcon = (method: string) => {
    switch(method?.toLowerCase()) {
      case 'wallet': return <Wallet className="h-4 w-4 text-blue-500" />;
      case 'bank': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'gcash': return <Send className="h-4 w-4 text-blue-500" />;
      case 'remittance': return <Send className="h-4 w-4 text-orange-500" />;
      case 'original': return <CreditCard className="h-4 w-4 text-purple-500" />;
      default: return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  // Check if wallet details exist
  const hasWalletDetails = () => {
    return refund.wallet || refund.wallet_details || refund.refundwallet || refund.refund_wallet || false;
  };

  // Render wallet details
  const renderWalletDetails = () => {
    const wallet = refund.wallet || refund.wallet_details || refund.refundwallet || refund.refund_wallet;
    if (!wallet) return null;

    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Provider</span>
            <p className="font-medium text-sm">{wallet.provider || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium text-sm">{wallet.account_name || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <p className="font-medium text-sm">{wallet.account_number || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Contact Number</span>
            <p className="font-medium text-sm">{wallet.contact_number || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  // Check if bank details exist
  const hasBankDetails = () => {
    return refund.bank || refund.bank_details || refund.refundbank || refund.refund_bank || false;
  };

  // Render bank details
  const renderBankDetails = () => {
    const bank = refund.bank || refund.bank_details || refund.refundbank || refund.refund_bank;
    if (!bank) return null;

    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Bank Name</span>
            <p className="font-medium text-sm">{bank.bank_name || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium text-sm">{bank.account_name || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <p className="font-medium text-sm">{bank.account_number || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Type</span>
            <p className="font-medium text-sm capitalize">{bank.account_type || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground text-[10px]">Branch</span>
            <p className="font-medium text-sm">{bank.branch || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  // Check if remittance details exist
  const hasRemittanceDetails = () => {
    return refund.remittance || refund.remittance_details || refund.refundremittance || refund.refund_remittance || false;
  };

  // Render remittance details
  const renderRemittanceDetails = () => {
    const remittance = refund.remittance || refund.remittance_details;
    if (!remittance) return null;

    const fullName = [
      remittance.first_name,
      remittance.middle_name,
      remittance.last_name
    ].filter(Boolean).join(' ');

    const fullAddress = [
      remittance.street,
      remittance.barangay,
      remittance.city,
      remittance.province,
      remittance.country
    ].filter(Boolean).join(', ');

    return (
      <div className="space-y-3 text-xs">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Provider</span>
            <p className="font-medium text-sm">{remittance.provider || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Full Name</span>
            <p className="font-medium text-sm">{fullName || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground text-[10px]">Contact Number</span>
            <p className="font-medium text-sm">{remittance.contact_number || 'N/A'}</p>
          </div>
        </div>

        {/* Address */}
        <div className="border-t border-blue-200 pt-2">
          <span className="text-muted-foreground text-[10px] block mb-1">Address</span>
          <p className="font-medium text-sm">{fullAddress || 'N/A'}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            {remittance.zip_code && (
              <div>
                <span className="text-muted-foreground text-[9px]">Zip Code</span>
                <p className="font-medium text-xs">{remittance.zip_code}</p>
              </div>
            )}
          </div>
        </div>

        {/* ID Information */}
        {(remittance.valid_id_type || remittance.valid_id_number) && (
          <div className="border-t border-blue-200 pt-2">
            <span className="text-muted-foreground text-[10px] block mb-1">ID Information</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {remittance.valid_id_type && (
                <div>
                  <span className="text-muted-foreground text-[9px]">ID Type</span>
                  <p className="font-medium text-xs">{remittance.valid_id_type}</p>
                </div>
              )}
              {remittance.valid_id_number && (
                <div>
                  <span className="text-muted-foreground text-[9px]">ID Number</span>
                  <p className="font-medium text-xs">{remittance.valid_id_number}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render GCash details
  const renderGCashDetails = () => {
    const gcash = refund.gcash_details || refund.gcash || refund.refundgcash || refund.refund_gcash || refund.gcash_account || null;
    if (!gcash) return null;

    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium text-sm">{gcash.account_name || gcash.name || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Mobile Number</span>
            <p className="font-medium text-sm">{gcash.mobile_number || gcash.contact_number || gcash.msisdn || 'N/A'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground text-[10px]">Email</span>
            <p className="font-medium text-sm">{gcash.email || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  };

  // Render payment details based on method and available data (support multiple field names)
  const renderPaymentDetails = () => {
    const methodRaw = refund.final_refund_method || refund.preferred_refund_method || refund.buyer_preferred_refund_method || refund.refund_method || '';
    const method = String(methodRaw).toLowerCase();

    if (method === 'wallet' && hasWalletDetails()) return renderWalletDetails();
    if (method === 'bank' && hasBankDetails()) return renderBankDetails();
    if (method === 'remittance' && hasRemittanceDetails()) return renderRemittanceDetails();
    if (method === 'gcash' && (refund.gcash_details || refund.gcash || refund.refundgcash || refund.refund_gcash)) return renderGCashDetails();

    // Fallback: if no method-specific details but any payment data exists, try to render any available block
    if (hasWalletDetails()) return renderWalletDetails();
    if (hasBankDetails()) return renderBankDetails();
    if (hasRemittanceDetails()) return renderRemittanceDetails();
    if (refund.gcash_details || refund.gcash || refund.refundgcash || refund.refund_gcash) return renderGCashDetails();

    return (
      <div className="text-xs text-muted-foreground italic p-2">
        No additional details available for this payment method.
      </div>
    );
  };

  // Handle proof file selection
  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    
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
    
    setSelectedProofFiles(validFiles);
    const urls = validFiles.map((f) => URL.createObjectURL(f));
    setProofPreviews(urls);
  };

  const removeProofFile = (index: number) => {
    setSelectedProofFiles(prev => prev.filter((_, i) => i !== index));
    setProofPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  // Check if proof is uploaded
  const hasProofs = () => {
    const existingProofs = (refund?.proofs || []).length;
    return existingProofs > 0 || selectedProofFiles.length > 0;
  };

  // Upload proofs
  const uploadProofs = async () => {
    if (selectedProofFiles.length === 0) {
      toast({ title: 'No files selected', description: 'Please select proof files to upload', variant: 'destructive' });
      return false;
    }
    
    const idToUse = refund?.refund || refund?.refund_id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return false;
    }
    
    try {
      setUploadingProofs(true);
      const formData = new FormData();
      
      selectedProofFiles.forEach((f) => {
        formData.append('file_data', f);
      });
      
      if (proofNotes) {
        formData.append('notes', proofNotes);
      }
      
      const response = await AxiosInstance.post(
        `/return-refund/${encodeURIComponent(String(idToUse))}/add_proof/`,
        formData,
        {
          headers: { 
            'X-User-Id': String(user?.id || ''),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data) {
        toast({ title: 'Success', description: 'Proof uploaded successfully' });
        
        setSelectedProofFiles([]);
        setProofPreviews([]);
        setProofNotes('');
        
        // Refresh refund data
        try {
          const refreshRes = await AxiosInstance.get(
            `/admin-refunds/${encodeURIComponent(String(idToUse))}/get_admin_refund_details/`,
            { headers: { 'X-User-Id': String(user?.id || '') } }
          );
          if (refreshRes.data) {
            setRefund(refreshRes.data);
          }
        } catch (refreshErr) {
          console.log('Failed to refresh refund data after proof upload:', refreshErr);
        }
        
        return true;
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message || 'Failed to upload proof', 
        variant: 'destructive' 
      });
      return false;
    } finally {
      setUploadingProofs(false);
    }
  };

  // Complete refund with proof requirement
  const handleCompleteRefund = async () => {
    const idToUse = refund?.refund || refund?.refund_id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    if (!hasProofs()) {
      toast({ 
        title: 'Proof Required', 
        description: 'Please upload proof of refund before completing', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      for (const f of selectedProofFiles) {
        formData.append('file_data', f);
      }

      if (proofNotes) formData.append('notes', proofNotes);
      formData.append('set_status', 'completed');
      
      if (adminNotes) formData.append('customer_note', adminNotes);

      const response = await AxiosInstance.post(
        `/return-refund/${encodeURIComponent(String(idToUse))}/process_refund/`,
        formData,
        {
          headers: { 
            'X-User-Id': String(user?.id || ''),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data) {
        toast({ title: 'Success', description: 'Refund marked as completed' });

        setSelectedProofFiles([]);
        setProofPreviews([]);
        setProofNotes('');
        setAdminNotes('');

        onComplete();
        
        if (response.data.refund) {
          setRefund(response.data.refund);
        }
      }
    } catch (err: any) {
      console.error('Error completing refund:', err);
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message || 'Failed to complete refund', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark as failed
  const handleMarkAsFailed = async () => {
    const idToUse = refund?.refund || refund?.refund_id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('set_status', 'failed');
      
      if (adminNotes) formData.append('customer_note', adminNotes);

      const response = await AxiosInstance.post(
        `/return-refund/${encodeURIComponent(String(idToUse))}/process_refund/`,
        formData,
        {
          headers: { 
            'X-User-Id': String(user?.id || ''),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data) {
        toast({ title: 'Success', description: 'Refund marked as failed' });
        
        setRefund((prev: any) => ({ 
          ...prev, 
          refund_payment_status: 'failed'
        }));
        
        onCancel();
      }
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message || 'Failed to mark as failed', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Existing proofs display
  const ExistingProofs = () => {
    if (!refund?.proofs || refund.proofs.length === 0) return null;
    
    return (
      <div className="mt-3">
        <p className="text-xs font-medium mb-2">Uploaded Proofs ({refund.proofs.length})</p>
        <div className="flex flex-wrap gap-2">
          {refund.proofs.map((proof: any, index: number) => (
            <div key={proof.id || index} className="relative w-16 h-16">
              {proof.file_url && proof.file_url.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                <img 
                  src={proof.file_url} 
                  alt={`Proof ${index + 1}`} 
                  className="w-full h-full object-cover rounded border"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border rounded bg-gray-100">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const refundMethod = refund.final_refund_method || refund.preferred_refund_method || refund.buyer_preferred_refund_method || refund.refund_method || 'Not specified';
  const hasPaymentDetails = (
    hasWalletDetails() || hasBankDetails() || hasRemittanceDetails() ||
    Boolean(refund.gcash_details || refund.gcash || refund.gcash_account || refund.buyer_wallet || refund.bank_account)
  );

  return (
    <div className="space-y-4">
      {/* Refund Details Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <Wallet className="h-4 w-4 text-blue-600" />
            Refund Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Amount Information */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Approved Amount</span>
                <p className="text-lg font-semibold text-green-600">
                  ₱{Number(refund.approved_refund_amount || refund.total_refund_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Original Amount</span>
                <p className="text-sm">
                  ₱{Number(refund.order_total_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
            </div>

            {/* Refund Method (View Only) */}
            <div className="border-t pt-2">
              <span className="text-xs text-muted-foreground block mb-1">Refund Method (provided by buyer)</span>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                {getMethodIcon(refundMethod)}
                <div>
                  <p className="text-sm font-medium capitalize">
                    {refundMethod}
                  </p>
                  {refund.final_refund_method && refund.preferred_refund_method && refund.final_refund_method !== refund.preferred_refund_method && (
                    <p className="text-[10px] text-muted-foreground">
                      Buyer preferred: {refund.preferred_refund_method}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Details - Only show if details exist */}
            {hasPaymentDetails && (
              <div className="border-t pt-2">
                <span className="text-xs text-muted-foreground block mb-2">Payment Details</span>
                <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100">
                  {renderPaymentDetails()}
                </div>
              </div>
            )}

            {/* Order Information */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
              <div>
                <span className="text-muted-foreground">Order ID:</span>
                <p className="font-medium">{refund.order_id || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <p className="font-medium">{refund.requested_by_username || 'N/A'}</p>
              </div>
              {refund.requested_by_email && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{refund.requested_by_email}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
     
      {/* Proof Upload */}
      <Card className={!hasProofs() ? "border-red-300" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className={`h-4 w-4 ${!hasProofs() ? 'text-red-500' : 'text-gray-600'}`} />
            Proof of Refund {!hasProofs() && <Badge className="bg-red-500 text-white text-[10px]">Required</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">
            Upload proof that the refund has been processed (screenshot, receipt, bank transfer confirmation, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleProofFileSelect}
                className="text-xs h-8"
                disabled={uploadingProofs || isSubmitting}
              />
              {selectedProofFiles.length > 0 && (
                <Button
                  onClick={uploadProofs}
                  disabled={uploadingProofs || isSubmitting}
                  size="sm"
                  variant="outline"
                  className="h-8"
                >
                  {uploadingProofs ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            {proofPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {proofPreviews.map((preview, index) => (
                  <div key={index} className="relative w-16 h-16">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeProofFile(index)}
                      className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border shadow-sm"
                    >
                      <XCircle className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <ExistingProofs />

            {!hasProofs() && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span>Proof required before completing refund</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            Admin Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about the refund processing..."
            className="w-full border rounded-md p-2 text-xs min-h-[60px]"
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAsFailed}
          disabled={isSubmitting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          Mark Failed
        </Button>
        
        <Button
          size="sm"
          onClick={handleCompleteRefund}
          disabled={isSubmitting || !hasProofs()}
          className={hasProofs() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <CheckSquare className="h-3 w-3 mr-1" />
          )}
          {hasProofs() ? 'Complete Refund' : 'Proof Required'}
        </Button>
      </div>
    </div>
  );
}

export async function loader({ request, context, params }: any) {
  // Basic admin auth middleware
  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
    await requireRole(request, undefined, ['isAdmin'] as any);
  } catch (err) {
    console.error('loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const refundId = params?.refundId || url.searchParams.get('refund_id') || url.searchParams.get('refund');

  if (!refundId) {
    throw new Response('refund id required', { status: 400 });
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  // First try to get the refund details directly from admin endpoint
  try {
    const detailEndpoint = `${API_BASE_URL}/admin-refunds/${encodeURIComponent(String(refundId))}/get_admin_refund_details/`;
    const detailRes = await fetch(detailEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-User-Id': String(userId)
      },
      credentials: 'include'
    });

    if (detailRes.ok) {
      const details = await detailRes.json();
      
      // Fetch disputes for this refund
      let enrichedRefund = details;
      try {
        const disputesRes = await fetch(`${API_BASE_URL}/disputes/?refund_id=${encodeURIComponent(String(refundId))}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-User-Id': String(userId)
          },
          credentials: 'include'
        });

        if (disputesRes.ok) {
          const disputesData = await disputesRes.json();
          const disputes = Array.isArray(disputesData) ? disputesData : 
                          Array.isArray(disputesData?.data) ? disputesData.data : [];
          
          // Find active dispute for this refund
          const activeDispute = disputes.find((d: any) => 
            String(d.refund) === String(refundId) || 
            String(d.refund_id) === String(refundId)
          );

          if (activeDispute) {
            const disputeStatus = String(activeDispute.status).toLowerCase();
            
            // Only override the refund status if the dispute is under review
            if (disputeStatus === 'under_review' || disputeStatus === 'investigating' || disputeStatus === 'in_review') {
              enrichedRefund = { 
                ...enrichedRefund, 
                status: 'under_review',
                dispute_reason: enrichedRefund.dispute_reason || activeDispute.reason || activeDispute.dispute_reason,
                dispute_details: activeDispute,
                dispute_request: activeDispute
              };
            } else {
              // For pending or approved disputes, just attach the dispute info without overriding status
              enrichedRefund = {
                ...enrichedRefund,
                dispute_request: activeDispute,
                dispute_details: activeDispute,
                dispute_reason: enrichedRefund.dispute_reason || activeDispute.reason || activeDispute.dispute_reason
              };
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch disputes', err);
      }
      
      const user = { id: userId, isAdmin: true };
      return { user, refund: enrichedRefund };
    }
  } catch (err) {
    console.error('Failed to fetch admin details, falling back to refund_list', err);
  }

  // Fallback to refund_list if direct details fail
  const endpoint = `${API_BASE_URL}/admin-refunds/refund_list/`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User-Id': String(userId)
    },
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Response(text || 'Failed to fetch refunds list', { status: res.status });
  }

  const list = await res.json();
  const refunds: RefundFlat[] = Array.isArray(list) ? list : Array.isArray(list.refunds) ? list.refunds : [];

  const refund = refunds.find(r => String(r.refund) === String(refundId) || String(r.refund).startsWith(String(refundId)));

  if (!refund) {
    throw new Response('Refund not found', { status: 404 });
  }

  // Try to fetch disputes
  let enrichedRefund = refund;
  try {
    const disputesRes = await fetch(`${API_BASE_URL}/disputes/?refund_id=${encodeURIComponent(String(refund.refund))}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-User-Id': String(userId)
      },
      credentials: 'include'
    });

    if (disputesRes.ok) {
      const disputesData = await disputesRes.json();
      const disputes = Array.isArray(disputesData) ? disputesData : 
                      Array.isArray(disputesData?.data) ? disputesData.data : [];
      
      // Find active dispute for this refund
      const activeDispute = disputes.find((d: any) => 
        String(d.refund) === String(refund.refund) || 
        String(d.refund_id) === String(refund.refund)
      );

      if (activeDispute) {
        const disputeStatus = String(activeDispute.status).toLowerCase();
        
        // Only override the refund status if the dispute is under review
        if (disputeStatus === 'under_review' || disputeStatus === 'investigating' || disputeStatus === 'in_review') {
          enrichedRefund = { 
            ...enrichedRefund, 
            status: 'under_review',
            dispute_reason: enrichedRefund.dispute_reason || activeDispute.reason || activeDispute.dispute_reason,
            dispute_details: activeDispute,
            dispute_request: activeDispute
          };
        } else {
          // For pending or approved disputes, just attach the dispute info without overriding status
          enrichedRefund = {
            ...enrichedRefund,
            dispute_request: activeDispute,
            dispute_details: activeDispute,
            dispute_reason: enrichedRefund.dispute_reason || activeDispute.reason || activeDispute.dispute_reason
          };
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch disputes', err);
  }

  const user = { id: userId, isAdmin: true };

  return { user, refund: enrichedRefund };
}

export default function AdminViewRefundDetails() {
  const { refund: initialRefund, user } = useLoaderData<typeof loader>();
  const [refund, setRefund] = useState<RefundFlat & { [key: string]: any }>(initialRefund);
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // State for refund decision (these will be used in Under Review section)
  const [refundType, setRefundType] = useState<'full' | 'partial' | ''>('');
  const [refundAmount, setRefundAmount] = useState<number>(initialRefund.total_refund_amount || 0);
  const [selectedLiabilities, setSelectedLiabilities] = useState<string[]>([]);
  
  // Split options state for Under Review section
  const [splitType, setSplitType] = useState<'equal' | '70_30' | '30_70' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'reject' | 'confirm' | null>(null);
  const [modalAuthChecked, setModalAuthChecked] = useState(false);

  // Map liability IDs to backend case_type values
  const liabilityOptions = [
    { id: 'merchant_fulfillment_issue', label: 'Merchant Fulfillment Issue (Seller)' },
    { id: 'logistics_delivery_issue', label: 'Logistics / Delivery Issue (Delivery Partner)' },
    { id: 'customer_related_issue', label: 'Customer-Related Issue (Customer)' },
    { id: 'shared_responsibility', label: 'Shared Responsibility' },
    { id: 'platform_system_issue', label: 'Platform / System Issue' }
  ];

  // Initialize custom splits when liabilities change
  useEffect(() => {
    if (selectedLiabilities.length > 1) {
      const initial: Record<string, number> = {};
      const equalSplit = 100 / selectedLiabilities.length;
      selectedLiabilities.forEach(id => {
        initial[id] = Math.round(equalSplit * 100) / 100;
      });
      setCustomSplits(initial);
    }
  }, [selectedLiabilities.length]);

  const handleLiabilityChange = (liabilityId: string) => {
    setSelectedLiabilities(prev => 
      prev.includes(liabilityId)
        ? prev.filter(id => id !== liabilityId)
        : [...prev, liabilityId]
    );
  };

  const handleCustomSplitChange = (liabilityId: string, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    setCustomSplits(prev => ({
      ...prev,
      [liabilityId]: numValue
    }));
  };

  const getCustomSplitTotal = () => {
    return Object.values(customSplits).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  const handleConfirmProcessRefund = async () => {
    if (selectedLiabilities.length === 0) {
      toast({ 
        title: 'Error', 
        description: 'Please select at least one liability category.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!refundType) {
      toast({ 
        title: 'Error', 
        description: 'Please select full or partial refund.', 
        variant: 'destructive' 
      });
      return;
    }

    if (refundType === 'partial' && (!refundAmount || refundAmount <= 0)) {
      toast({ 
        title: 'Error', 
        description: 'Please enter a valid partial refund amount.', 
        variant: 'destructive' 
      });
      return;
    }

    if (selectedLiabilities.length > 1 && splitType === 'custom' && getCustomSplitTotal() !== 100) {
      toast({ 
        title: 'Error', 
        description: 'Custom split must total 100%.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, find the active dispute for this refund
      const disputesRes = await AxiosInstance.get('/disputes/', {
        params: { refund_id: String(refund.refund) },
        headers: { 'X-User-Id': String(user?.id || '') }
      });

      const disputes = Array.isArray(disputesRes?.data) ? disputesRes.data : 
                      Array.isArray(disputesRes?.data?.data) ? disputesRes.data.data : [];
      
      const activeDispute = disputes.find((d: any) => 
        String(d.refund) === String(refund.refund) || 
        String(d.refund_id) === String(refund.refund)
      );

      if (!activeDispute || !activeDispute.id) {
        toast({ 
          title: 'Error', 
          description: 'No active dispute found for this refund.', 
          variant: 'destructive' 
        });
        setIsSubmitting(false);
        return;
      }

      // Build admin notes with split information if applicable
      let adminNotes = `Case resolved with liabilities: ${selectedLiabilities.map(id => liabilityOptions.find(opt => opt.id === id)?.label).join(', ')}. Refund decision: ${refundType} refund of ₱${refundAmount.toFixed(2)}.`;
      
      // Add split details if multiple liabilities
      if (selectedLiabilities.length > 1) {
        let splitDetails = '';
        if (splitType === 'equal') {
          splitDetails = `Equal split (${(100 / selectedLiabilities.length).toFixed(1)}% each)`;
        } else if (splitType === 'custom') {
          const splits = Object.entries(customSplits).map(([id, pct]) => 
            `${liabilityOptions.find(opt => opt.id === id)?.label}: ${pct}%`
          ).join(', ');
          splitDetails = `Custom split: ${splits}`;
        } else {
          const [firstPct, secondPct] = splitType.split('_').map(Number);
          splitDetails = `Split ${firstPct}% / ${secondPct}%`;
        }
        adminNotes += ` Liability split: ${splitDetails}`;
      }

      // 1. First update the dispute with case category(s) and refund type/amount
      const caseCategoryValue = selectedLiabilities.length > 0 ? selectedLiabilities : [];

      await AxiosInstance.patch(`/disputes/${activeDispute.id}/`, {
        case_category: caseCategoryValue,
        admin_notes: adminNotes
      }, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });

      // 2. Then call the accept endpoint to approve the dispute with the approved amount
      await AxiosInstance.post(`/disputes/${activeDispute.id}/accept/`, {
        admin_notes: adminNotes,
        approved_amount: refundAmount
      }, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });

      toast({ 
        title: 'Success', 
        description: `Refund has been approved with ${refundType} refund of ₱${refundAmount.toFixed(2)}.` 
      });

      // Update local state
      setRefund(prev => ({ 
        ...prev, 
        status: 'approved',
        refund_payment_status: 'pending',
        approved_refund_amount: refundAmount,
        dispute_request: {
          ...prev.dispute_request,
          status: 'approved',
          case_category: caseCategoryValue,
          admin_notes: adminNotes
        }
      }));

      // Clear selections
      setSelectedLiabilities([]);
      setRefundType('');
      setRefundAmount(refund.total_refund_amount || 0);
      setSplitType('equal');
      setCustomSplits({});

      // Force a refresh of the refund data
      try {
        const refreshRes = await AxiosInstance.get(`/admin-refunds/${encodeURIComponent(String(refund.refund))}/get_admin_refund_details/`, {
          headers: { 'X-User-Id': String(user?.id || '') }
        });
        if (refreshRes.data) {
          setRefund(prev => ({ 
            ...prev, 
            ...refreshRes.data,
            status: 'approved',
            dispute_request: {
              ...prev.dispute_request,
              ...refreshRes.data.dispute_request,
              status: 'approved'
            }
          }));
        }
      } catch (refreshErr) {
        console.log('Failed to refresh refund data', refreshErr);
      }

    } catch (err: any) {
      console.error('Error processing refund:', err);
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || 'Failed to process refund. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    setProcessing(true);
    try {
      console.log('Processing refund:', refund.refund);
      
      const response = await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(refund.refund))}/admin_process_refund/`,
        { status: 'processing' },
        {
          headers: { 
            'X-User-Id': String(user?.id || ''),
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Process refund response:', response.data);

      if (response.data.success) {
        toast({ 
          title: 'Success', 
          description: 'Refund payment status set to processing.' 
        });
        
        setRefund(prev => ({ 
          ...prev, 
          refund_payment_status: 'processing'
        }));

        try {
          const refreshRes = await AxiosInstance.get(
            `/admin-refunds/${encodeURIComponent(String(refund.refund))}/get_admin_refund_details/`,
            { headers: { 'X-User-Id': String(user?.id || '') } }
          );
          if (refreshRes.data) {
            console.log('Refreshed refund data:', refreshRes.data);
            setRefund(prev => ({ 
              ...prev, 
              ...refreshRes.data
            }));
          }
        } catch (refreshErr) {
          console.log('Failed to refresh refund data:', refreshErr);
        }
      } else {
        toast({ 
          title: 'Error', 
          description: response.data.error || 'Failed to set refund to processing', 
          variant: 'destructive' 
        });
      }
      
    } catch (err: any) {
      console.error('Failed to set refund to processing - Full error:', err);
      
      let errorMessage = 'Failed to set refund to processing';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteRefund = () => {
    setRefund(prev => ({ 
      ...prev, 
      status: 'completed',
      refund_payment_status: 'completed',
      processed_at: new Date().toISOString()
    }));
    toast({ 
      title: 'Completed', 
      description: 'Refund has been marked as completed.' 
    });
  };

  const handleCancelProcessing = () => {
    setRefund(prev => ({ 
      ...prev, 
      refund_payment_status: 'pending'
    }));
    toast({ 
      title: 'Cancelled', 
      description: 'Refund processing has been cancelled.' 
    });
  };

  useEffect(() => {
    try {
      if (searchParams.get('action') === 'process') {
        const el = document.getElementById('admin-actions');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const btn = el.querySelector('button');
          if (btn) (btn as HTMLElement).focus();
        }
      }
    } catch (err) {
      // ignore errors
    }
  }, [searchParams]);
  
  const onAction = async (action: 'approve' | 'reject' | 'complete' | 'process') => {
    setProcessing(true);
    try {
      const endpoint = `/admin-refunds/${action}/`;
      const payload = { refund_id: refund.refund, reason };
      const res = await AxiosInstance.post(endpoint, payload);

      toast({ title: `Action ${action} sent`, description: res?.data?.message || 'Request sent to server' });

      if (res?.data?.status) {
        setRefund(prev => ({ ...prev, status: res.data.status }));
      }
    } catch (err) {
      console.error('Action error', err);
      toast({ title: 'Action failed', description: String(err), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const renderStatusUI = () => {
    const status = String(refund.status || '').toLowerCase();
    const rr = refund.return_request;
    const paymentCompleted = String(refund.refund_payment_status || refund.payment_refund_status || refund.payment_status || refund.paymentRefundStatus || '').toLowerCase() === 'completed';

    // Derive dispute status from possible locations
    const disputeStatus = String(
      refund.dispute?.status ||
      (Array.isArray(refund.disputes) && refund.disputes[0]?.status) ||
      refund.dispute_details?.status ||
      refund.dispute_request?.status ||
      ''
    ).toLowerCase();

    // Only force under_review if dispute is under review AND refund status is dispute
    const disputeUnderReviewStates = ['under_review', 'investigating', 'in_review'];
    const shouldForceUnderReview = disputeUnderReviewStates.includes(disputeStatus) && status === 'dispute';
    const displayedStatus = shouldForceUnderReview ? 'under_review' : status;

    // If payment is completed, show completed UI
    if (paymentCompleted && displayedStatus === 'approved') {
      return <CompletedStatusUI refund={refund} />;
    }

    // Map status to appropriate UI component
    switch (displayedStatus) {
      case 'pending':
        return <PendingStatusUI refund={refund} />;
      case 'negotiation':
        return <NegotiationStatusUI refund={refund} />;
      case 'approved':
        return <ApprovedStatusUI refund={refund} />;
      case 'waiting':
        return <WaitingStatusUI refund={refund} />;
      case 'shipped':
        return <ShippedStatusUI refund={refund} />;
      case 'received':
        return <ReceivedStatusUI refund={refund} />;
      case 'to_verify':
        return <ToVerifyStatusUI refund={refund} />;
      case 'inspected':
        return <InspectedStatusUI refund={refund} />;
      case 'to_process':
        return <ToProcessStatusUI refund={refund} />;
      case 'dispute':
        return <DisputeStatusUI refund={refund} />;
      case 'under_review':
        return <UnderReviewStatusUI refund={refund} />;
      case 'completed':
        return <CompletedStatusUI refund={refund} />;
      case 'rejected':
        return <RejectedStatusUI refund={refund} />;
      case 'cancelled':
        return <CancelledStatusUI refund={refund} />;
      default:
        // Handle return_request status if main status doesn't match
        if (rr?.status) {
          const rrStatus = String(rr.status).toLowerCase();
          if (rrStatus === 'shipped') return <ShippedStatusUI refund={refund} />;
          if (rrStatus === 'received') return <ReceivedStatusUI refund={refund} />;
          if (rrStatus === 'inspected') return <InspectedStatusUI refund={refund} />;
        }
        return null;
    }
  };

  // Compute the status to display on badges and action gating
  const st = (() => {
    const s = String(refund.status || '').toLowerCase();
    const disputeStatus = String(
      refund.dispute?.status ||
      (Array.isArray(refund.disputes) && refund.disputes[0]?.status) ||
      refund.dispute_details?.status ||
      refund.dispute_request?.status ||
      ''
    ).toLowerCase();
    
    // Only force under_review if dispute is under review AND refund status is dispute
    const disputeUnderReviewStates = ['under_review', 'investigating', 'in_review'];
    if (disputeUnderReviewStates.includes(disputeStatus) && s === 'dispute') {
      return 'under_review';
    }
    return s;
  })();

  // Normalize payment status (support alternate field names)
  const getPaymentStatusLower = () => String(
    refund.refund_payment_status || refund.payment_refund_status || refund.payment_status || refund.paymentRefundStatus || ''
  ).toLowerCase();

  // Check if we're in processing state: refund must be approved and payment status set to processing
  const isProcessing = getPaymentStatusLower() === 'processing' && String(refund.status || '').toLowerCase() === 'approved';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Debug: show raw dispute payloads when URL param ?dispute_debug=1 is present */}
      {String(searchParams.get('dispute_debug')) === '1' && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Dispute Debug (raw)</CardTitle>
            <CardDescription className="text-xs">Raw dispute fields from `refund` object</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs">
              <pre className="whitespace-pre-wrap text-[11px]">
{JSON.stringify({ dispute_request: refund.dispute_request, dispute_details: refund.dispute_details, disputes: refund.disputes, dispute: refund.dispute }, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-4 h-4" /> Refund {refund.refund}
                <StatusBadge status={st} />
              </CardTitle>
              <CardDescription className="text-xs">Admin view — details and actions</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
            <div>Requested: {refund.requested_at ? new Date(refund.requested_at).toLocaleDateString() : 'N/A'}</div>
            {st !== 'dispute' && refund.processed_at && (
              <div>Processed: {new Date(refund.processed_at).toLocaleDateString()}</div>
            )}
          </div>  
          </div>
        </CardHeader>

        <CardContent>
          {isProcessing ? (
            // Show Processing UI with all necessary props (split options removed)
            <ProcessingUI 
              refund={refund}
              onComplete={handleCompleteRefund}
              onCancel={handleCancelProcessing}
              user={user}
              setRefund={setRefund}
            />
          ) : (
            // Show normal refund details UI
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                {/* Status-specific UI */}
                {renderStatusUI()}

                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border rounded-md p-2">
                    <span className="text-muted-foreground block">Customer</span>
                    <span className="font-medium">{refund.requested_by_username || 'N/A'}</span>
                    {refund.requested_by_email && (
                      <span className="text-muted-foreground block text-[10px]">{refund.requested_by_email}</span>
                    )}
                  </div>
                  <div className="border rounded-md p-2">
                    <span className="text-muted-foreground block">Order</span>
                    <span className="font-medium">{refund.order_id || 'N/A'}</span>
                    <span className="text-muted-foreground block text-[10px]">
                      Total: ₱{Number(refund.order_total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="border rounded-md p-2 text-xs">
                  <span className="text-muted-foreground block mb-1">Reason</span>
                  <span>{refund.reason || 'No reason provided'}</span>
                </div>

                {/* Shipping / Logistics */}
                {(refund.logistic_service || refund.tracking_number || refund.return_request) && (
                  <div className="border rounded-md p-2 text-xs">
                    <span className="text-muted-foreground block mb-1">Shipping</span>
                    <span>
                      {refund.return_request?.logistic_service || refund.logistic_service || 'N/A'} •{' '}
                      {refund.return_request?.tracking_number || refund.tracking_number || 'N/A'}
                    </span>
                    {refund.return_request?.tracking_url && (
                      <a href={refund.return_request.tracking_url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline block mt-1 text-[10px]">
                        Track Package →
                      </a>
                    )}
                  </div>
                )}

                {/* Methods */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border rounded-md p-2">
                    <span className="text-muted-foreground block">Preferred</span>
                    <span>{refund.preferred_refund_method || 'N/A'}</span>
                  </div>
                  <div className="border rounded-md p-2">
                    <span className="text-muted-foreground block">Final</span>
                    <span>{refund.final_refund_method || 'N/A'}</span>
                  </div>
                </div>

                {/* Media */}
                {refund.has_media && (
                  <div className="border rounded-md p-2 text-xs">
                    <span className="text-muted-foreground">Media: {refund.media_count || 0} file(s)</span>
                  </div>
                )}
              </div>

              {/* Admin Actions Sidebar */}
              <aside className="space-y-3">
                <Card id="admin-actions" className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Admin Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {!(st === 'approved' && getPaymentStatusLower() === 'completed') && st !== 'under_review' && st !== 'processing' && (
                      <Button
                        size="sm"
                        className="w-full text-xs h-8"
                        disabled={processing}
                        onClick={async () => {
                          if (st.includes('negotiation')) {
                            setShowConfirmModal(true);
                            return;
                          }
                          if (st === 'dispute') {
                            try {
                              setProcessing(true);
                              const listRes = await AxiosInstance.get('/disputes/', {
                                params: { refund_id: String(refund.refund) },
                                headers: { 'X-User-Id': String(user?.id || '') }
                              });
                              const disputes = Array.isArray(listRes?.data) ? listRes.data : [];
                              const first = disputes[0];
                              if (!first || !first.id) {
                                toast({ title: 'No dispute found', description: 'Cannot start review without an existing dispute.', variant: 'destructive' });
                                setProcessing(false);
                                return;
                              }

                              // Start the review
                              await AxiosInstance.post(`/disputes/${first.id}/start_review/`, null, {
                                headers: { 'X-User-Id': String(user?.id || '') }
                              });

                              toast({ title: 'Review started', description: 'Dispute marked under review.' });

                              // Update local state
                              setRefund(prev => ({ 
                                ...prev, 
                                status: 'under_review',
                                dispute_reason: prev.dispute_reason || first.reason
                              }));

                            } catch (err) {
                              console.error('Start review error', err);
                              toast({ title: 'Failed to start review', description: String(err), variant: 'destructive' });
                            } finally {
                              setProcessing(false);
                            }
                            return;
                          }

                          // If refund is already approved, run the Process Refund flow
                          if (st === 'approved') {
                            try {
                              await handleProcessRefund();
                            } catch (err) {
                              console.error('Process refund action failed', err);
                              toast({ title: 'Error', description: 'Failed to initiate refund processing', variant: 'destructive' });
                            }
                            return;
                          }
                        }}
                      >
                        {st === 'dispute' ? (
                          <>
                            <ShieldAlert className="w-3 h-3 mr-1" /> Start Review
                          </>
                        ) : st === 'approved' ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" /> Process Refund
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" /> Proceed
                          </>
                        )}
                      </Button>
                    )}

                    {/* Under Review Actions with Split Options */}
                    {st === 'under_review' && (
                      <>
                        {/* Refund Type Selection */}
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Refund Decision</p>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="full_refund"
                                name="refund_type"
                                value="full"
                                checked={refundType === 'full'}
                                onChange={(e) => {
                                  setRefundType(e.target.value as 'full');
                                  if (e.target.value === 'full') {
                                    setRefundAmount(refund.total_refund_amount || 0);
                                  }
                                }}
                                className="h-3 w-3"
                              />
                              <Label htmlFor="full_refund" className="text-xs cursor-pointer">
                                Full Refund
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="partial_refund"
                                name="refund_type"
                                value="partial"
                                checked={refundType === 'partial'}
                                onChange={(e) => setRefundType(e.target.value as 'partial')}
                                className="h-3 w-3"
                              />
                              <Label htmlFor="partial_refund" className="text-xs cursor-pointer">
                                Partial Refund
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Refund Amount Input */}
                        {refundType && (
                          <div className="space-y-1 mb-3">
                            <Label htmlFor="refund_amount" className="text-xs">
                              Amount {refundType === 'full' && '(Full)'}
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                              <Input
                                id="refund_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={refund.total_refund_amount || 0}
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                                disabled={refundType === 'full'}
                                className="pl-6 text-xs h-7"
                                placeholder="Enter amount"
                              />
                            </div>
                          </div>
                        )}

                        {/* Liability Checkboxes */}
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Liability / Case Category</p>
                          <div className="space-y-1">
                            {liabilityOptions.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={option.id} 
                                  checked={selectedLiabilities.includes(option.id)}
                                  onCheckedChange={() => handleLiabilityChange(option.id)}
                                  className="h-3 w-3"
                                />
                                <Label htmlFor={option.id} className="text-xs cursor-pointer">
                                  {option.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Split Options - Only when multiple liabilities selected */}
                        {selectedLiabilities.length > 1 && (
                          <div className="border-t pt-2 mt-1 mb-3">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              Split Options
                            </p>
                            
                            <div className="space-y-2">
                              {/* Split Type Selection */}
                              <div className="flex flex-wrap gap-2">
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name="splitType"
                                    checked={splitType === 'equal'}
                                    onChange={() => setSplitType('equal')}
                                    className="h-3 w-3"
                                  />
                                  Equal
                                </label>

                                {selectedLiabilities.length === 2 && (
                                  <>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="radio"
                                        name="splitType"
                                        checked={splitType === '70_30'}
                                        onChange={() => setSplitType('70_30')}
                                        className="h-3 w-3"
                                      />
                                      70/30
                                    </label>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="radio"
                                        name="splitType"
                                        checked={splitType === '30_70'}
                                        onChange={() => setSplitType('30_70')}
                                        className="h-3 w-3"
                                      />
                                      30/70
                                    </label>
                                  </>
                                )}

                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name="splitType"
                                    checked={splitType === 'custom'}
                                    onChange={() => setSplitType('custom')}
                                    className="h-3 w-3"
                                  />
                                  Custom
                                </label>
                              </div>

                              {/* Custom Split Inputs */}
                              {splitType === 'custom' && (
                                <div className="space-y-1 mt-1">
                                  {selectedLiabilities.map((liabilityId) => {
                                    const option = liabilityOptions.find(opt => opt.id === liabilityId);
                                    const shortLabel = option?.label.split('(')[0].trim() || liabilityId;
                                    
                                    return (
                                      <div key={liabilityId} className="flex items-center gap-2 text-xs">
                                        <span className="w-20 truncate">{shortLabel}:</span>
                                        <div className="relative w-16">
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={customSplits[liabilityId] || 0}
                                            onChange={(e) => handleCustomSplitChange(liabilityId, e.target.value)}
                                            className="text-xs h-6 pr-5"
                                            placeholder="0"
                                          />
                                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  
                                  {getCustomSplitTotal() !== 100 && (
                                    <p className="text-[9px] text-red-500">
                                      Total: {getCustomSplitTotal()}% (must be 100%)
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Split Preview for non-custom */}
                              {splitType !== 'custom' && selectedLiabilities.length > 0 && (
                                <div className="bg-purple-50 rounded p-1.5 text-[10px] mt-1">
                                  <p className="font-medium text-purple-700 mb-0.5">Preview:</p>
                                  {selectedLiabilities.map((id, idx) => {
                                    const option = liabilityOptions.find(opt => opt.id === id);
                                    const shortLabel = option?.label.split('(')[0].trim() || id;
                                    let pct = 0;
                                    if (splitType === 'equal') {
                                      pct = 100 / selectedLiabilities.length;
                                    } else if (selectedLiabilities.length === 2) {
                                      const [first, second] = splitType.split('_').map(Number);
                                      pct = idx === 0 ? first : second;
                                    }
                                    const amount = (refundAmount * pct) / 100;
                                    return (
                                      <div key={id} className="flex justify-between">
                                        <span>{shortLabel}:</span>
                                        <span>{pct}% (₱{amount.toFixed(2)})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Single Liability Indicator */}
                        {selectedLiabilities.length === 1 && (
                          <div className="bg-green-50 border border-green-200 rounded p-1.5 mb-3">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-[10px] font-medium text-green-700">100% Liability</span>
                            </div>
                            <p className="text-[9px] text-green-600">
                              {liabilityOptions.find(opt => opt.id === selectedLiabilities[0])?.label}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full text-xs h-7"
                            disabled={selectedLiabilities.length === 0 || !refundType}
                            onClick={() => {
                              setAuthAction('reject');
                              setModalAuthChecked(false);
                              setShowAuthModal(true);
                            }}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>

                          <Button
                            size="sm"
                            className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              if (selectedLiabilities.length === 0) {
                                toast({ title: 'Error', description: 'Select liability', variant: 'destructive' });
                                return;
                              }
                              if (!refundType) {
                                toast({ title: 'Error', description: 'Select refund type', variant: 'destructive' });
                                return;
                              }
                              if (refundType === 'partial' && (!refundAmount || refundAmount <= 0)) {
                                toast({ title: 'Error', description: 'Enter valid amount', variant: 'destructive' });
                                return;
                              }
                              if (selectedLiabilities.length > 1 && splitType === 'custom' && getCustomSplitTotal() !== 100) {
                                toast({ title: 'Error', description: 'Split must total 100%', variant: 'destructive' });
                                return;
                              }
                              setAuthAction('confirm');
                              setModalAuthChecked(false);
                              setShowAuthModal(true);
                            }}
                            disabled={selectedLiabilities.length === 0 || isSubmitting || !refundType}
                          >
                            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve Refund'}
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {refund.processed_by_username && st === 'under_review' && refund.processed_at && (
                      <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                        Processed by: {refund.processed_by_username} • {new Date(refund.processed_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Authorization modal used for Reject / Confirm actions */}
                <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{authAction === 'reject' ? 'Confirm Rejection' : 'Authorize Approval'}</DialogTitle>
                      <DialogDescription>
                        {authAction === 'reject'
                          ? 'Are you sure you want to reject this dispute? This action cannot be undone.'
                          : refundType === 'full' 
                            ? `Please confirm you authorize approving a FULL refund of ₱${refundAmount.toFixed(2)}.`
                            : `Please confirm you authorize approving a PARTIAL refund of ₱${refundAmount.toFixed(2)}.`}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox id="modal-auth" checked={modalAuthChecked} onCheckedChange={(v) => setModalAuthChecked(v === true)} className="h-3 w-3 mt-0.5" />
                        <Label htmlFor="modal-auth" className="text-[12px] text-muted-foreground leading-tight">
                          I hereby declare that I have reviewed the refund case thoroughly and determined the responsible party. I authorize the approval of the {refundType} refund of ₱{refundAmount.toFixed(2)} in accordance with the selected resolution.
                        </Label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAuthModal(false)}>Cancel</Button>
                      <Button
                        onClick={async () => {
                          setShowAuthModal(false);
                          try {
                            if (authAction === 'reject') {
                              setProcessing(true);
                              const listRes = await AxiosInstance.get('/disputes/', {
                                params: { refund_id: String(refund.refund) },
                                headers: { 'X-User-Id': String(user?.id || '') }
                              });
                              const disputes = Array.isArray(listRes?.data) ? listRes.data : Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
                              const active = disputes.find((d: any) => String(d.refund) === String(refund.refund) || String(d.refund_id) === String(refund.refund));
                              if (!active || !active.id) {
                                toast({ title: 'No dispute found', description: 'Cannot reject without an existing dispute.', variant: 'destructive' });
                                setProcessing(false);
                                return;
                              }

                              await AxiosInstance.post(`/disputes/${active.id}/reject/`, { admin_notes: 'Rejected by admin' }, {
                                headers: { 'X-User-Id': String(user?.id || '') }
                              });

                              toast({ title: 'Rejected', description: 'Dispute has been rejected.' });
                              setRefund(prev => ({ ...prev, status: 'rejected' }));
                            } else if (authAction === 'confirm') {
                              await handleConfirmProcessRefund();
                            }
                          } catch (err: any) {
                            console.error('Auth action error', err);
                            toast({ title: 'Error', description: err.response?.data?.error || 'Action failed', variant: 'destructive' });
                          } finally {
                            setProcessing(false);
                            setIsSubmitting(false);
                            setAuthAction(null);
                            setModalAuthChecked(false);
                          }
                        }}
                        disabled={!modalAuthChecked}
                      >
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </aside>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog when admin overrides active negotiation */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proceed with refund?</DialogTitle>
            <DialogDescription>
              This refund is currently under negotiation. Processing it now will bypass or close the negotiation. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button onClick={() => {
              setShowConfirmModal(false);
              handleProcessRefund();
            }}>
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}