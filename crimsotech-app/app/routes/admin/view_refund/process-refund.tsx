// AdminProcessingRefundUI.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { useToast } from '~/hooks/use-toast';
import {
  ArrowLeft,
  Wallet,
  Building,
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  Mail,
  Shield,
  AlertCircle,
  CheckSquare,
  Camera
} from 'lucide-react';

function AdminProcessingRefundUI({ 
  refund, 
  userId, 
  shopId,
  onUpdateRefund,
  onComplete,
  onSetPaymentStatus,
  autoOpenDetails 
}: { 
  refund: any; 
  userId: string | number;
  shopId?: string;
  onUpdateRefund?: (updatedRefund: any) => void;
  onComplete?: () => Promise<boolean>;
  onSetPaymentStatus?: (setStatus: 'processing' | 'completed' | 'failed') => Promise<void>;
  autoOpenDetails?: boolean;
}) {
  const [showRefundMethodDetails, setShowRefundMethodDetails] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (autoOpenDetails) setShowRefundMethodDetails(true);
  }, [autoOpenDetails]);

  const navigate = useNavigate();
  
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
  
  // Get requested amount
  const getRequestedAmount = (refund: any) => {
    if (!refund) return 0;
    // Prefer admin-approved amount when present
    if (refund.approved_refund_amount != null) return Number(refund.approved_refund_amount);
    if (refund.total_refund_amount != null) return Number(refund.total_refund_amount);
    const itemsTotal = (refund.order_items || []).reduce((sum: number, it: any) => {
      const t = (it.total != null) ? Number(it.total) : (it.price != null ? Number(it.price) * Number(it.checkout_quantity || 1) : 0);
      return sum + (Number.isFinite(t) ? t : 0);
    }, 0);
    if (itemsTotal > 0) return itemsTotal;
    if (refund.order_info?.total_amount != null) return Number(refund.order_info.total_amount);
    return 0;
  };
  
  // API URL helper
  const apiUrlFor = (path: string) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  };
  
  // Check if proof is uploaded
  const hasProofs = () => {
    const existingProofs = (refund?.proofs || []).length;
    return existingProofs > 0 || selectedProofFiles.length > 0;
  };
  
  const refundMethod = refund?.final_refund_method || refund?.preferred_refund_method || refund?.buyer_preferred_refund_method;
  const paymentDetails = refund?.payment_details || {};
  // Determine shop id to send with admin requests: prefer explicit prop, else derive from refund data
  const effectiveShopId = shopId || refund?.shop?.id || refund?.order_info?.shop_id || '';

  // Display the admin-approved amount if available, otherwise fall back to stored total_refund_amount
  const displayedAmount = getRequestedAmount(refund) || null;


  const RefundMethodDetails = () => {
    const refundMethodLocal = (refund?.final_refund_method || refund?.preferred_refund_method || refund?.buyer_preferred_refund_method || '').toString();
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
              <p className="font-medium text-sm">{walletInfo.wallet_id || walletInfo.account_number || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Account Owner</Label>
              <p className="font-medium text-sm">{walletInfo.account_name || walletInfo.owner_name || walletInfo.name || refund?.requested_by_user?.username || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Provider</Label>
              <p className="font-medium text-sm">{walletInfo.provider || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Account Number</Label>
              <p className="font-medium text-sm">{walletInfo.account_number || '—'}</p>
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
              <p className="font-medium text-sm">{bankInfo.account_name || refund?.requested_by_user?.username || '—'}</p>
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
              <p className="font-medium text-sm">{remittanceInfo.receiver_name || refund?.requested_by_user?.username || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Contact Number</Label>
              <p className="font-medium text-sm">{remittanceInfo.contact_number || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Address</Label>
              <p className="font-medium text-sm">{`${remittanceInfo.street || ''} ${remittanceInfo.city || ''} ${remittanceInfo.province || ''}`.trim() || '—'}</p>
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

  // Handle proof file selection
  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    
    // Client-side validation
    const validFiles = files.filter((f) => {
      const isImage = f.type && f.type.startsWith('image/');
      const maxSize = 5 * 1024 * 1024; // 5MB
      
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
    
    // Generate previews
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

  // Upload proofs via admin endpoint
  const uploadProofs = async () => {
    if (selectedProofFiles.length === 0) {
      toast({ title: 'No files selected', description: 'Please select proof files to upload', variant: 'destructive' });
      return false;
    }
    
    const idToUse = refund?.refund_id || refund?.refund || refund?.id;
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
      
      // Use admin endpoint for proof upload
      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/add_proof/`), {
        method: 'POST',
        headers: {
          'X-User-Id': String(userId),
          'X-Shop-Id': effectiveShopId || '',
        },
        credentials: 'include',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => null);
        toast({ title: 'Success', description: 'Proof uploaded successfully' });
        
        // Clear selected files
        setSelectedProofFiles([]);
        setProofPreviews([]);
        setProofNotes('');
        
        // Update refund data if provided
        if (data && data.refund && onUpdateRefund) {
          onUpdateRefund(data.refund);
        }
        
        return true;
      } else {
        const errorText = await response.text().catch(() => 'Failed to upload proof');
        throw new Error(errorText || 'Failed to upload proof');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to upload proof', 
        variant: 'destructive' 
      });
      return false;
    } finally {
      setUploadingProofs(false);
    }
  };

  // Admin: Complete refund - PROOF IS REQUIRED
  const handleCompleteRefund = async () => {
    const idToUse = refund?.refund_id || refund?.refund || refund?.id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    // PROOF IS REQUIRED - Check if proof is uploaded
    if (!hasProofs()) {
      toast({ 
        title: 'Proof Required', 
        description: 'Please upload proof of refund before completing', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setActionLoading(true);

      const formData = new FormData();

      // include selected files (if any)
      for (const f of selectedProofFiles) {
        formData.append('file_data', f);
      }

      if (proofNotes) formData.append('notes', proofNotes);
      formData.append('set_status', 'completed');
      if (adminNotes) formData.append('customer_note', adminNotes);
      if (refund?.final_refund_method) formData.append('final_refund_method', refund.final_refund_method);

      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/admin_process_refund/`), {
        method: 'POST',
        headers: {
          'X-User-Id': String(userId),
          'X-Shop-Id': effectiveShopId || '',
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        toast({ title: 'Success', description: 'Refund marked as completed by admin' });

        // Clear selected files
        setSelectedProofFiles([]);
        setProofPreviews([]);
        setProofNotes('');

        if (data && data.refund && onUpdateRefund) {
          onUpdateRefund(data.refund);
        }

        if (onComplete) {
          await onComplete();
        }
      } else {
        const errorText = await response.text().catch(() => 'Failed to complete refund');
        throw new Error(errorText || 'Failed to complete refund');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to complete refund', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Mark as failed - PROOF NOT REQUIRED for failure
  const handleMarkAsFailed = async () => {
    const idToUse = refund?.refund_id || refund?.refund || refund?.id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }

    try {
      setActionLoading(true);

      const formData = new FormData();
      formData.append('set_status', 'failed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/admin_process_refund/`), {
        method: 'POST',
        headers: {
          'X-User-Id': String(userId),
          'X-Shop-Id': effectiveShopId || '',
        },
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        toast({ title: 'Success', description: 'Refund marked as failed' });

        if (data && data.refund && onUpdateRefund) {
          onUpdateRefund(data.refund);
        }
      } else {
        const errorText = await response.text().catch(() => 'Failed to update status');
        throw new Error(errorText || 'Failed to update status');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update status', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Escalate to dispute (if needed) - PROOF NOT REQUIRED for escalation
  const handleEscalateToDispute = async () => {
    const idToUse = refund?.refund_id || refund?.refund || refund?.id;
    if (!idToUse) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await fetch(apiUrlFor(`/return-refund/${encodeURIComponent(String(idToUse))}/admin_update_refund/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId),
          'X-Shop-Id': shopId || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'dispute',
          customer_note: adminNotes 
            ? `[Admin Escalated]: ${adminNotes}` 
            : '[Admin Escalated]: Case escalated to dispute by administrator',
        }),
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => null);
        toast({ title: 'Success', description: 'Refund escalated to dispute' });
        
        if (data && data.refund && onUpdateRefund) {
          onUpdateRefund(data.refund);
        }
      } else {
        const errorText = await response.text().catch(() => 'Failed to escalate to dispute');
        throw new Error(errorText || 'Failed to escalate to dispute');
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to escalate to dispute', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Existing proofs display
  const ExistingProofs = () => {
    if (!refund?.proofs || refund.proofs.length === 0) return null;
    
    return (
      <div className="mt-4">
        <Label className="text-sm font-medium">Existing Proofs</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {refund.proofs.map((proof: any, index: number) => (
            <div key={proof.id || index} className="relative">
              {proof.file_url && proof.file_url.toLowerCase().match(/\.(jpeg|jpg|png|gif)$/) ? (
                <img 
                  src={proof.file_url} 
                  alt={`Proof ${index + 1}`} 
                  className="w-full h-20 object-cover rounded border"
                />
              ) : (
                <div className="w-full h-20 flex items-center justify-center border rounded bg-gray-100">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              )}
              {proof.notes && (
                <div className="text-xs text-gray-600 mt-1 truncate">{proof.notes}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const buyerMethod = (refund?.buyer_preferred_refund_method || '').toString();
  const buyerMethodLabel = buyerMethod ? buyerMethod.replace('_', ' ') : null;

  // If refund is approved and payment already completed, show completed UI instead of processing actions
  const isApprovedAndPaymentCompleted = String(refund?.status || '').toLowerCase() === 'approved' && String((refund?.refund_payment_status || '')).toLowerCase().trim() === 'completed';

  if (isApprovedAndPaymentCompleted) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckSquare className="h-6 w-6 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-emerald-800">Refund Completed</p>
                  <p className="text-sm text-emerald-700 mt-1">This refund has been processed and completed by the moderation/admin team.</p>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Payment Status</p>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{String(refund?.refund_payment_status || 'completed').toUpperCase()}</Badge>
                </div>

                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Final Amount</p>
                  <p className="text-sm font-medium">{formatMoney(displayedAmount)}</p>
                  {refund?.approved_refund_amount != null ? (
                    <p className="text-xs text-gray-500 mt-1">(amount sourced from <span className="font-medium">approved_refund_amount</span>)</p>
                  ) : refund?.total_refund_amount != null ? (
                    <p className="text-xs text-gray-500 mt-1">(amount sourced from <span className="font-medium">total_refund_amount</span>)</p>
                  ) : null}
                </div>

                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Payment Method</p>
                  <p className="text-sm font-medium">{(refund?.final_refund_method || refund?.preferred_refund_method || 'N/A').toString().replace('_', ' ')}</p>
                </div>

                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Refund Type</p>
                  <p className="text-sm font-medium">{(refund?.refund_type || refund?.refund_category || 'N/A').toString().replace('_', ' ')}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Processed By</p>
                  <p className="text-sm font-medium">{refund?.processed_by_username || refund?.processed_by || 'System'}</p>
                  {refund?.processed_by_email && <p className="text-xs text-gray-600">{refund.processed_by_email}</p>}
                </div>

                <div className="bg-white/50 p-3 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Processed At</p>
                  <p className="text-sm">{refund?.processed_at ? new Date(refund.processed_at).toLocaleString() : '—'}</p>
                </div>
              </div>

              {refund?.customer_note && (
                <div className="mt-4 p-3 bg-white/50 rounded border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Admin Notes</p>
                  <p className="text-sm text-gray-700">{refund.customer_note}</p>
                </div>
              )}

              {/* Proofs */}
              <div className="mt-4">
                <ExistingProofs />
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <div>Refund ID: <span className="font-medium">{refund?.refund || refund?.refund_id || '—'}</span></div>
                <div>Order: <span className="font-medium">{refund?.order_id || refund?.order_info?.order_number || '—'}</span></div>
                <div>Shop: <span className="font-medium">{refund?.shop?.name || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Status Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">Admin Refund Processing</p>
              <p className="text-sm text-purple-700">
                Processing refund as administrator
                {refund?.shop?.name && ` • Shop: ${refund.shop.name}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white">
            <Shield className="h-3 w-3 mr-1" />
            Admin Mode
          </Badge>
        </div>
      </div>

      {/* Payment Details Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Refund Amount</p>
          <p className="text-xl font-bold text-green-600">
            {formatMoney(refund?.approved_refund_amount ?? refund?.total_refund_amount ?? displayedAmount)}
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
            {refund?.refund_category?.replace('_', ' ') || refund?.refund_type || '—'}
          </p>
        </div>
      </div>

      {/* Buyer chosen refund method and details (show prominently for admin) */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/50 p-3 rounded border">
          <p className="text-xs font-medium text-gray-600 mb-1">Refund Amount</p>
          <p className="text-lg font-bold">{formatMoney(displayedAmount)}</p>
          {refund?.refund_fee != null && (
            <p className="text-xs text-gray-500 mt-1">Fee: {formatMoney(refund.refund_fee)}</p>
          )}
          {refund?.requested_refund_amount != null && (
            <p className="text-xs text-gray-500 mt-1">Requested: {formatMoney(refund.requested_refund_amount)}</p>
          )}
        </div>

        <div className="bg-white/50 p-3 rounded border">
          <p className="text-xs font-medium text-gray-600 mb-1">Payment Details</p>
          {paymentDetails.wallet ? (
            <div className="text-sm">
              <div className="font-medium">{(paymentDetails.wallet.provider || 'E-wallet')}</div>
              <div className="text-xs">Wallet ID: {paymentDetails.wallet.wallet_id || paymentDetails.wallet.account_number || '—'}</div>
              <div className="text-xs">Owner: {paymentDetails.wallet.account_name || paymentDetails.wallet.owner_name || refund?.requested_by_user?.username || '—'}</div>
            </div>
          ) : paymentDetails.bank ? (
            <div className="text-sm">
              <div className="font-medium">Bank Transfer</div>
              <div className="text-xs">Bank: {paymentDetails.bank.bank_name || '—'}</div>
              <div className="text-xs">Account: {paymentDetails.bank.account_number || '—'}</div>
              <div className="text-xs">Account Name: {paymentDetails.bank.account_name || '—'}</div>
            </div>
          ) : paymentDetails.remittance ? (
            <div className="text-sm">
              <div className="font-medium">Remittance</div>
              <div className="text-xs">Provider: {paymentDetails.remittance.provider || '—'}</div>
              <div className="text-xs">Receiver: {paymentDetails.remittance.first_name || ''} {paymentDetails.remittance.last_name || ''}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No payment details provided</div>
          )}

          <div className="mt-3">
            <p className="text-xs font-medium text-gray-600 mb-1">Buyer Selected Refund Method</p>
            <p className="text-sm font-medium">{(refund?.buyer_preferred_refund_method || refund?.final_refund_method || refund?.preferred_refund_method || 'Not specified').toString().replace('_', ' ')}</p>
            <div className="mt-3">
              <RefundMethodDetails />
            </div>
          </div>
        </div>
      </div>

      {String(refund.status || '').toLowerCase() === 'approved' && String((refund.final_refund_type || '').toLowerCase()) === 'return' && (String(refund.refund_payment_status || '').toLowerCase() === 'pending' || String(refund.refund_payment_status || '').toLowerCase() === '') ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Waiting for buyer to ship the item</p>
              <p className="text-sm text-yellow-700">The refund was approved as a return and is awaiting the buyer to provide shipping/tracking information.</p>
            </div>
          </div>
        </div>
      ) : null}

     

      {/* Refund Method Details */}
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
            <RefundMethodDetails />
            
            {/* Show detailed buyer payment details */}
            {buyerMethod && buyerMethod.toLowerCase().includes('wallet') && (
              <div className="mt-4 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Buyer eWallet Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Provider</div>
                    <div className="font-medium">{refund?.payment_details?.wallet?.provider || refund?.payment_details?.wallet?.wallet_provider || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account / Wallet ID</div>
                    <div className="font-medium">{refund?.payment_details?.wallet?.account_number || refund?.payment_details?.wallet?.wallet_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Owner</div>
                    <div className="font-medium">{refund?.payment_details?.wallet?.owner_name || refund?.payment_details?.wallet?.name || refund?.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Contact Number</div>
                    <div className="font-medium">{refund?.payment_details?.wallet?.contact_number || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {buyerMethod && (buyerMethod.toLowerCase().includes('bank') || buyerMethod.toLowerCase().includes('bank_transfer')) && (
              <div className="mt-4 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Bank Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Bank</div>
                    <div className="font-medium">{refund?.payment_details?.bank?.bank_name || refund?.payment_details?.bank?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Name</div>
                    <div className="font-medium">{refund?.payment_details?.bank?.account_name || refund?.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Account Number</div>
                    <div className="font-medium">{refund?.payment_details?.bank?.account_number || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Branch / SWIFT</div>
                    <div className="font-medium">{refund?.payment_details?.bank?.branch || refund?.payment_details?.bank?.swift || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {buyerMethod && (buyerMethod.toLowerCase().includes('remittance') || buyerMethod.toLowerCase().includes('money_transfer') || buyerMethod.toLowerCase().includes('remit')) && (
              <div className="mt-4 p-3 bg-white border rounded text-sm">
                <div className="text-xs text-gray-500 mb-1">Remittance Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600">Provider</div>
                    <div className="font-medium">{refund?.payment_details?.remittance?.provider || refund?.payment_details?.remittance?.service || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Receiver Name</div>
                    <div className="font-medium">{refund?.payment_details?.remittance?.receiver_name || refund?.requested_by_user?.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Reference / Account</div>
                    <div className="font-medium">{refund?.payment_details?.remittance?.reference || refund?.payment_details?.remittance?.account || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Contact Number</div>
                    <div className="font-medium">{refund?.payment_details?.remittance?.contact_number || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Proof Upload Section (REQUIRED for completion) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-red-500" />
            <Label className="text-lg font-medium text-red-700">Proof of Refund (REQUIRED)</Label>
          </div>
          <span className="text-sm text-gray-500">
            Uploaded: {refund?.proofs?.length || 0}/4
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handleProofFileSelect}
              className="flex-1"
              disabled={uploadingProofs || actionLoading}
            />
          </div>
          
          {proofPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {proofPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Proof preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removeProofFile(index)}
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1 border shadow-sm"
                    disabled={uploadingProofs || actionLoading}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div>
            <Label className="text-sm">Proof Notes (Optional)</Label>
            <Textarea
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="Add notes about the proof files (e.g., transaction ID, date, etc.)..."
              className="mt-1"
              disabled={uploadingProofs || actionLoading}
            />
          </div>
        </div>
        
        <ExistingProofs />
        
        {/* Proof Status Indicator */}
        <div className={`p-3 rounded-lg ${hasProofs() ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2">
            {hasProofs() ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Proof uploaded ✓ Complete Refund button is now enabled
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  Proof required! Upload proof of refund to enable Complete Refund button
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Proof of refund (screenshot/receipt) is required before completing the refund process.
          </p>
        </div>
      </div>

      <Separator />

      {/* Admin Actions Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-gray-600" />
          <Label className="text-lg font-medium">Admin Actions</Label>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes about this refund processing..."
              className="mt-1"
              disabled={actionLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes will be recorded in the refund history
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* COMPLETE REFUND BUTTON - DISABLED UNTIL PROOF IS UPLOADED */}
            <Button
              onClick={handleCompleteRefund}
              disabled={actionLoading || !hasProofs()}
              className={`w-full ${hasProofs() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
              title={!hasProofs() ? "Upload proof of refund to enable this button" : ""}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckSquare className="h-4 w-4 mr-2" />
              )}
              {hasProofs() ? 'Complete Refund' : 'Proof Required'}
            </Button>
            
            {/* MARK AS FAILED BUTTON - Always enabled (proof not required for failure) */}
            <Button
              onClick={handleMarkAsFailed}
              disabled={actionLoading}
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Mark as Failed
            </Button>
            
          </div>
          
          {/* Warning for no proofs - More prominent */}
          {!hasProofs() && (
            <Alert variant="destructive" className="border-l-4 border-l-red-500">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Proof of Refund Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>You must upload proof of refund before completing the process.</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Screenshot of bank transfer confirmation</li>
                  <li>Receipt from remittance center</li>
                  <li>Wallet transaction screenshot</li>
                  <li>Any other proof showing refund was processed</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}


export default AdminProcessingRefundUI;