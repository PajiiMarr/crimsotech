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
import { useToast } from '~/hooks/use-toast';
import AxiosInstance from '~/components/axios/Axios';
import { 
  ArrowLeft, CheckCircle, XCircle, Eye, AlertTriangle, Package, 
  PackageCheck, Truck, Clock, MessageCircle, User, Wallet, 
  Calendar, RefreshCw, CheckSquare, ShieldAlert, Ban, 
  FileText, ShoppingBag, CreditCard, DollarSign, Shield,
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
    case_category?: string;
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

function ApprovedStatusUI({ refund, onProcessRefund }: { refund: RefundFlat & { [key: string]: any }, onProcessRefund: () => void }) {
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
            {refund.dispute_request.case_category?.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </div>
          {refund.dispute_request.admin_notes && (
            <div className="text-xs text-purple-600 mt-1">
              <span className="font-medium">Notes:</span> {refund.dispute_request.admin_notes}
            </div>
          )}
        </div>
      )}
      
      {/* Process Refund Button */}
      <Button
        onClick={onProcessRefund}
        className="w-full bg-green-600 hover:bg-green-700"
        size="sm"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Process Refund
      </Button>
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

// ===== PROCESSING UI COMPONENT =====
function ProcessingUI({ refund, onComplete, onCancel }: { 
  refund: RefundFlat & { [key: string]: any },
  onComplete: () => void,
  onCancel: () => void
}) {
  const [selectedMethod, setSelectedMethod] = useState<string>(
    refund.final_refund_method || refund.preferred_refund_method || 'wallet'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const { toast } = useToast();

  const refundMethods = [
    { id: 'wallet', label: 'Wallet Credit', icon: Wallet, description: 'Instant credit to user wallet' },
    { id: 'original', label: 'Original Payment', icon: CreditCard, description: 'Refund to original payment method (3-5 business days)' },
    { id: 'bank', label: 'Bank Transfer', icon: DollarSign, description: 'Manual bank transfer (1-2 business days)' },
    { id: 'gcash', label: 'GCash', icon: Send, description: 'Send to GCash account' }
  ];

  const handleCompleteRefund = async () => {
    setIsSubmitting(true);
    try {
      // Update refund payment status to completed
      await AxiosInstance.post(
        `/return-refund/${encodeURIComponent(String(refund.refund))}/admin_complete_refund/`,
        {
          final_refund_method: selectedMethod,
          refund_payment_status: 'completed'
        },
        { headers: { 'X-User-Id': String(refund.processed_by_username) } }
      );

      toast({ 
        title: 'Success', 
        description: 'Refund has been completed successfully.' 
      });

      // Update local state
      onComplete();
      
    } catch (err: any) {
      console.error('Error completing refund:', err);
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || 'Failed to complete refund', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmComplete(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-medium text-blue-800">Processing Refund</h3>
            <p className="text-sm text-blue-600 mt-1">
              Select a refund method and complete the transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Refund Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Refund Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Refund Amount:</span>
              <p className="font-medium text-lg">₱{Number(refund.total_refund_amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Refund Fee:</span>
              <p className="font-medium">₱{Number(refund.refund_fee || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Preferred Method:</span>
              <p className="font-medium capitalize">{refund.preferred_refund_method || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Status:</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {refund.refund_payment_status || 'pending'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Method Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Select Refund Method</CardTitle>
          <CardDescription className="text-xs">
            Choose how the refund will be issued to the customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {refundMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <div
                  key={method.id}
                  className={`border rounded-md p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : ''}`}>
                        {method.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Transaction Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full border rounded-md p-2 text-sm min-h-[80px]"
            placeholder="Add any notes about this refund transaction..."
            defaultValue={refund.notes || ''}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-32"
        >
          Cancel
        </Button>
        
        <Button
          onClick={() => setShowConfirmComplete(true)}
          disabled={isSubmitting || !selectedMethod}
          className="w-48 bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Complete Refund
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmComplete} onOpenChange={setShowConfirmComplete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this refund? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Please verify:</p>
                  <ul className="list-disc list-inside text-yellow-700 mt-1 space-y-1">
                    <li>Refund amount: ₱{Number(refund.total_refund_amount || 0).toLocaleString()}</li>
                    <li>Method: {refundMethods.find(m => m.id === selectedMethod)?.label}</li>
                    <li>This will mark the refund as completed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmComplete(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteRefund} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  // Try to fetch the authoritative admin refund details and dispute status
  let enrichedRefund = refund;
  try {
    // First get admin refund details
    const detailEndpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(String(refund.refund))}/get_admin_refund_details/`;
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
      enrichedRefund = { ...refund, ...details };
    }

    // Then check dispute status to determine if we should show under_review
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
      const disputes = Array.isArray(disputesData) ? disputesData : Array.isArray(disputesData?.data) ? disputesData.data : [];
      
      // Find active dispute for this refund
      const activeDispute = disputes.find((d: any) => 
        String(d.refund) === String(refund.refund) && 
        ['pending', 'under_review', 'investigating', 'in_review'].includes(String(d.status).toLowerCase())
      );

      if (activeDispute) {
        const disputeStatus = String(activeDispute.status).toLowerCase();
        
        // Only override the refund status if the dispute is under review
        // Don't override if dispute is approved
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
    console.error('Failed to fetch additional details', err);
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
  
  // State for liability checkboxes
  const [selectedLiabilities, setSelectedLiabilities] = useState<string[]>([]);
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

  const handleLiabilityChange = (liabilityId: string) => {
    setSelectedLiabilities(prev => 
      prev.includes(liabilityId)
        ? prev.filter(id => id !== liabilityId)
        : [...prev, liabilityId]
    );
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

    // 1. First update the dispute with case category
    const caseCategoryValue = selectedLiabilities.length > 0 ? selectedLiabilities[0] : '';
    if (selectedLiabilities.length > 1) {
      toast({ title: 'Note', description: 'Multiple liabilities selected — only the first will be saved due to backend constraint.' });
    }

    // Update dispute with case category first
    await AxiosInstance.patch(`/disputes/${activeDispute.id}/`, {
      case_category: caseCategoryValue,
      admin_notes: `Case resolved with liabilities: ${selectedLiabilities.map(id => liabilityOptions.find(opt => opt.id === id)?.label).join(', ')}`
    }, {
      headers: { 'X-User-Id': String(user?.id || '') }
    });

    // 2. Then call the accept endpoint to approve the dispute
    // This will set dispute.status = 'approved' and update refund status
    await AxiosInstance.post(`/disputes/${activeDispute.id}/accept/`, {
      admin_notes: `Case resolved with liabilities: ${selectedLiabilities.map(id => liabilityOptions.find(opt => opt.id === id)?.label).join(', ')}`
    }, {
      headers: { 'X-User-Id': String(user?.id || '') }
    });

    // 3. Also update the refund status to approved (in case the accept action didn't do it)
    try {
      const formData = new FormData();
      formData.append('status', 'approved');
      
      await AxiosInstance.post(`/return-refund/${encodeURIComponent(String(refund.refund))}/admin_process_refund/`, formData, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });
    } catch (err) {
      console.log('Refund status update via admin_process_refund failed, but dispute is approved');
      // Try direct PATCH as fallback
      try {
        await AxiosInstance.patch(`/return-refund/${encodeURIComponent(String(refund.refund))}/`, {
          status: 'approved'
        }, {
          headers: { 'X-User-Id': String(user?.id || '') }
        });
      } catch (patchErr) {
        console.log('Direct PATCH also failed, but continuing...');
      }
    }

    toast({ 
      title: 'Success', 
      description: 'Refund has been approved.' 
    });

    // Update local state: refund approved, payment pending
    setRefund(prev => ({ 
      ...prev, 
      status: 'approved',
      refund_payment_status: 'pending',
      dispute_request: {
        ...prev.dispute_request,
        status: 'approved',
        case_category: caseCategoryValue,
        admin_notes: `Case resolved with liabilities: ${selectedLiabilities.map(id => liabilityOptions.find(opt => opt.id === id)?.label).join(', ')}`
      }
    }));

    // Clear selected liabilities
    setSelectedLiabilities([]);

    // Force a refresh of the refund data
    try {
      const refreshRes = await AxiosInstance.get(`/return-refund/${encodeURIComponent(String(refund.refund))}/get_admin_refund_details/`, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });
      if (refreshRes.data) {
        setRefund(prev => ({ 
          ...prev, 
          ...refreshRes.data,
          status: 'approved', // Ensure status is approved
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
      const formData = new FormData();
      formData.append('status', 'processing'); // Set to processing for payment

      await AxiosInstance.post(`/return-refund/${encodeURIComponent(String(refund.refund))}/admin_process_refund/`, formData, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });

      toast({ title: 'Processing', description: 'Refund payment status set to processing.' });
      
      // Update local state to show processing UI
      setRefund(prev => ({ 
        ...prev, 
        refund_payment_status: 'processing'
      }));
      
    } catch (err) {
      console.error('Failed to set refund to processing', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to set refund to processing', 
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
    const paymentCompleted = String(refund.refund_payment_status || '').toLowerCase() === 'completed';

    // Derive dispute status from possible locations
    const disputeStatus = String(
      refund.dispute?.status ||
      (Array.isArray(refund.disputes) && refund.disputes[0]?.status) ||
      refund.dispute_details?.status ||
      refund.dispute_request?.status ||
      ''
    ).toLowerCase();

    // Only force under_review if dispute is under review AND refund status is dispute
    // Don't force if dispute is approved
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
        return <ApprovedStatusUI refund={refund} onProcessRefund={handleProcessRefund} />;
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

  // Check if we're in processing state (payment status is processing)
  const isProcessing = String(refund.refund_payment_status || '').toLowerCase() === 'processing';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
            // Show Processing UI
            <ProcessingUI 
              refund={refund}
              onComplete={handleCompleteRefund}
              onCancel={handleCancelProcessing}
            />
          ) : (
            // Show normal refund details UI
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                {/* Status-specific UI - now compact */}
                {renderStatusUI()}

                {/* Basic Information - simplified */}
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

                {/* Reason - simplified */}
                <div className="border rounded-md p-2 text-xs">
                  <span className="text-muted-foreground block mb-1">Reason</span>
                  <span>{refund.reason || 'No reason provided'}</span>
                </div>

                {/* Shipping / Logistics - simplified */}
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

                {/* Methods - simplified */}
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

                {/* Media - simplified */}
                {refund.has_media && (
                  <div className="border rounded-md p-2 text-xs">
                    <span className="text-muted-foreground">Media: {refund.media_count || 0} file(s)</span>
                  </div>
                )}
              </div>

              {/* Admin Actions Sidebar - compact */}
              <aside className="space-y-3">
                <Card id="admin-actions" className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Admin Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {!(st === 'approved' && String(refund.refund_payment_status || '').toLowerCase() === 'completed') && st !== 'under_review' && st !== 'processing' && (
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

                    {/* Under Review Actions */}
                    {st === 'under_review' && (
                      <>
                        {/* Liability Checkboxes */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Liability / Case Category</p>
                          <div className="space-y-1.5">
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

                        {/* Escalate Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-8 border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            toast({ 
                              title: 'Escalated', 
                              description: 'Case has been escalated to senior admin.' 
                            });
                          }}
                        >
                          <ShieldAlert className="w-3 h-3 mr-1" /> Escalate
                        </Button>

                        {/* Reject Button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs h-8"
                          disabled={selectedLiabilities.length === 0 || processing}
                          onClick={() => {
                            if (selectedLiabilities.length === 0) {
                              toast({ title: 'Select liability', description: 'Please select a liability before rejecting.', variant: 'destructive' });
                              return;
                            }
                            setAuthAction('reject');
                            setModalAuthChecked(false);
                            setShowAuthModal(true);
                          }}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>

                        {/* Confirm & Approve Refund Button */}
                        <Button
                          size="sm"
                          className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => {
                            if (selectedLiabilities.length === 0) {
                              toast({ title: 'Select liability', description: 'Please select a liability before processing.', variant: 'destructive' });
                              return;
                            }
                            setAuthAction('confirm');
                            setModalAuthChecked(false);
                            setShowAuthModal(true);
                          }}
                          disabled={selectedLiabilities.length === 0 || isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" /> Confirm & Approve Refund
                            </>
                          )}
                        </Button>
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
                          : 'Please confirm you authorize approving this refund.'}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-3">
                      <div className="flex items-start space-x-2">
                        <Checkbox id="modal-auth" checked={modalAuthChecked} onCheckedChange={(v) => setModalAuthChecked(v === true)} className="h-3 w-3 mt-0.5" />
                        <Label htmlFor="modal-auth" className="text-[12px] text-muted-foreground leading-tight">
                          I hereby declare that I have reviewed the refund case thoroughly and determined the responsible party. I authorize the approval of the refund in accordance with the selected resolution.
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
                              // perform reject flow (reuse inline logic)
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
                              // call confirm handler but skip the declaration check (user authorized in modal)
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
              // Process refund directly
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