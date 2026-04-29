"use client";

import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserCheck, 
  Eye,
  AlertTriangle,
  Package,
  EyeOff,
  PackageCheck,
  Truck,
  Clock,
  MessageCircle,
  User,
  Wallet,
  Calendar,
  RefreshCw,
  CheckSquare,
  ShieldAlert,
  Ban,
  FileText,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Shield,
  Camera,
  Scale,
  Gavel,
  Loader2,
  Info,
  MapPin,
  Phone,
  Mail,
  Store,
  Bike,
  Image as ImageIcon,
  File as FileIcon,
  ExternalLink,
  Receipt,
  User as UserIcon,
  ImagePlus,
  Upload,
  History,
  ClipboardList,
  Store as StoreIcon,
} from 'lucide-react';
import type { Route } from './+types/view-refund-details';

export function meta(): Route.MetaDescriptors {
  return [{ title: "View Refund - Admin Investigation" }];
}

// ===== LIABILITY LABELS MAPPING =====
const liabilityLabels: Record<string, string> = {
  'merchant_fulfillment_issue': 'Merchant Fulfillment Issue (Seller)',
  'logistics_delivery_issue': 'Logistics / Delivery Issue (Delivery Partner)',
  'customer_related_issue': 'Customer-Related Issue (Customer)',
  'shared_responsibility': 'Shared Responsibility'
};

// ===== HELPER FUNCTIONS =====
const formatMoney = (value: unknown) => {
  try {
    const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  } catch { return '—'; }
};

function getActiveDispute(refund: any) {
  if (refund.dispute_details && Object.keys(refund.dispute_details).length > 0) return refund.dispute_details;
  if (refund.dispute_request && Object.keys(refund.dispute_request).length > 0) return refund.dispute_request;
  if (Array.isArray(refund.disputes) && refund.disputes.length > 0) {
    return refund.disputes.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];
  }
  return null;
}

function formatCaseCategory(category: any): string {
  if (!category) return '';
  if (Array.isArray(category)) {
    return category.map(c => {
      if (typeof c === 'object' && c !== null) return liabilityLabels[c.id] || c.label || c.id || '';
      if (typeof c === 'string') return liabilityLabels[c] || c.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return String(c);
    }).filter(Boolean).join(', ');
  }
  if (typeof category === 'string') {
    if (category.includes(',')) {
      return category.split(',').map(c => c.trim()).filter(Boolean).map(c => {
        const clean = c.replace(/[\[\]"]/g, '').trim();
        return liabilityLabels[clean] || clean.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }).join(', ');
    }
    const clean = category.replace(/[\[\]"]/g, '').trim();
    return liabilityLabels[clean] || clean.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return '';
}

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

// ===== STATUS CONFIGURATION =====
const statusConfig: Record<string, { label: string; color: string; icon: any; description: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock, description: 'Seller needs to review this refund request' },
  negotiation: { label: 'Negotiation', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: MessageCircle, description: 'Active negotiation between buyer and seller' },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle, description: 'Refund has been approved' },
  waiting: { label: 'Waiting', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package, description: 'Waiting for return shipment' },
  shipped: { label: 'Shipped', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Truck, description: 'Return item in transit' },
  received: { label: 'Received', color: 'bg-green-50 text-green-700 border-green-200', icon: PackageCheck, description: 'Item received by seller' },
  to_verify: { label: 'To Verify', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: PackageCheck, description: 'Item received, needs inspection' },
  inspected: { label: 'Inspected', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: CheckSquare, description: 'Item inspection complete' },
  to_process: { label: 'To Process', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: RefreshCw, description: 'Ready for refund processing' },
  dispute: { label: 'Dispute', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: ShieldAlert, description: 'Dispute filed - awaiting admin review' },
  under_review: { label: 'Under Review', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Scale, description: 'Admin is reviewing the dispute' },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckSquare, description: 'Return and refund completed' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, description: 'Request rejected' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Ban, description: 'Request cancelled' }
};

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

// ===== MEDIA GALLERY COMPONENT =====
function MediaGallery({ files, title }: { files: any[], title: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  if (!files || files.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium flex items-center gap-1">
        <ImageIcon className="h-3 w-3" />
        {title} ({files.length})
      </p>
      <div className="grid grid-cols-4 gap-2">
        {files.map((file, index) => (
          <div key={file.id || index} className="relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setSelectedImage(file.file_url)}>
            {file.file_url && file.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
              <img src={file.file_url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <FileIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Image Preview</DialogTitle></DialogHeader>
          <div className="mt-2 flex justify-center">
            <img src={selectedImage || ''} alt="Preview" className="max-h-[70vh] object-contain rounded" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.open(selectedImage || '', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" /> Open in new tab
            </Button>
            <Button onClick={() => setSelectedImage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== BUYER REQUEST CARD =====
function BuyerRequestCard({ refundMedia, refundDetails }: { refundMedia: any[], refundDetails: any }) {
  const buyerMedia = refundMedia.filter(m => m.uploaded_by_entity === 'buyer' || m.uploaded_by_entity === 'Buyer');
  
  if (buyerMedia.length === 0 && !refundDetails?.detailed_reason && !refundDetails?.reason) return null;
  
  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
          <UserIcon className="h-4 w-4" />
          Buyer's Refund Request
          <Badge className="bg-blue-100 text-blue-700 text-[10px]">Customer Evidence</Badge>
        </CardTitle>
        <CardDescription className="text-xs">The buyer's initial refund request and supporting evidence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Refund Reason:</span>
            <p className="font-medium mt-0.5">{refundDetails?.reason || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Requested Amount:</span>
            <p className="font-medium mt-0.5 text-blue-600">{formatMoney(refundDetails?.total_refund_amount)}</p>
          </div>
        </div>
        {refundDetails?.detailed_reason && (
          <div>
            <span className="text-xs text-muted-foreground block">Detailed Explanation:</span>
            <p className="text-sm mt-1 p-2 bg-white rounded border">{refundDetails.detailed_reason}</p>
          </div>
        )}
        {/* {refundDetails?.customer_note && (
          <div>
            <span className="text-xs text-muted-foreground block">Additional Note:</span>
            <p className="text-sm mt-1 p-2 bg-white rounded border italic">{refundDetails.customer_note}</p>
          </div>
        )} */}
        {refundDetails?.preferred_refund_method && (
          <div>
            <span className="text-xs text-muted-foreground block">Preferred Refund Method:</span>
            <p className="font-medium capitalize">{refundDetails.preferred_refund_method}</p>
          </div>
        )}
        {buyerMedia.length > 0 && (
          <div className="border-t pt-2 mt-1">
            <span className="text-xs font-medium flex items-center gap-1 mb-2">
              <ImagePlus className="h-3 w-3" /> Buyer's Evidence ({buyerMedia.length})
            </span>
            <MediaGallery files={buyerMedia} title="Buyer Evidence" />
            <div className="mt-1 text-[10px] text-muted-foreground">
              {buyerMedia.map((m, idx) => (
                <div key={idx}>Uploaded: {formatDateTime(m.uploaded_at)}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== SELLER RESPONSE CARD =====
function SellerResponseCard({ refundMedia, refundDetails }: { refundMedia: any[], refundDetails: any }) {
  // Don't show this card if the refund status is approved
  if (refundDetails?.status === 'approved') {
    return null;
  }
  
  const sellerMedia = refundMedia.filter(m => m.uploaded_by_entity === 'seller' || m.uploaded_by_entity === 'Seller');
  
  const hasSellerResponse = refundDetails?.status === 'rejected' || 
                            refundDetails?.reject_reason_code || 
                            sellerMedia.length > 0;
  
  if (!hasSellerResponse) {
    return (
      <Card className="border-gray-200 bg-gray-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <StoreIcon className="h-4 w-4" />
            Seller's Response
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">Seller has not responded to this refund request yet.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
          <StoreIcon className="h-4 w-4" />
          Seller's Response
          <Badge className="bg-orange-100 text-orange-700 text-[10px]">Seller Evidence</Badge>
        </CardTitle>
        <CardDescription className="text-xs">The seller's response to the refund request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {refundDetails?.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Refund Request Rejected by Seller</span>
            </div>
          </div>
        )}
        {refundDetails?.reject_reason_code && (
          <div>
            <span className="text-xs text-muted-foreground block">Rejection Code:</span>
            <p className="text-sm mt-1 font-medium">{refundDetails.reject_reason_code}</p>
            {refundDetails.reject_reason_details && (
              <p className="text-sm mt-1 p-2 bg-white rounded border">{refundDetails.reject_reason_details}</p>
            )}
          </div>
        )}
        {sellerMedia.length > 0 && (
          <div className="border-t pt-2 mt-1">
            <span className="text-xs font-medium flex items-center gap-1 mb-2">
              <ImagePlus className="h-3 w-3" /> Seller's Evidence ({sellerMedia.length})
            </span>
            <MediaGallery files={sellerMedia} title="Seller Evidence" />
            <div className="mt-1 text-[10px] text-muted-foreground">
              {sellerMedia.map((m, idx) => (
                <div key={idx}>Uploaded: {formatDateTime(m.uploaded_at)}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== DISPUTE DETAILS CARD =====
function DisputeDetailsCard({ dispute }: { dispute: any }) {
  if (!dispute) return null;
  const disputeStatus = dispute.status || 'filed';
  const statusColors: Record<string, string> = {
    filed: 'bg-yellow-50 text-yellow-700',
    under_review: 'bg-purple-50 text-purple-700',
    investigating: 'bg-purple-50 text-purple-700',
    in_review: 'bg-purple-50 text-purple-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    partial: 'bg-blue-50 text-blue-700'
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
          <ShieldAlert className="h-4 w-4" />
          Dispute Information
          <Badge className={`${statusColors[disputeStatus] || 'bg-gray-50'} text-xs ml-2`}>
            {disputeStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {dispute.reason && (
          <div>
            <span className="text-xs text-muted-foreground block">Dispute Reason</span>
            <p className="mt-1 p-2 bg-white rounded border text-sm">{dispute.reason}</p>
          </div>
        )}
        {dispute.case_category && (
          <div>
            <span className="text-xs text-muted-foreground block">Case Category</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {Array.isArray(dispute.case_category) ? (
                dispute.case_category.map((cat: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {liabilityLabels[cat] || cat.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {formatCaseCategory(dispute.case_category)}
                </Badge>
              )}
            </div>
          </div>
        )}
        {dispute.admin_notes && (
          <div>
            <span className="text-xs text-muted-foreground block">Admin Notes</span>
            <p className="mt-1 p-2 bg-white rounded border text-sm italic">{dispute.admin_notes}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs border-t pt-2">
          <div>
            <span className="text-muted-foreground">Filed By:</span>
            <p className="font-medium">{dispute.requested_by?.username || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Filed At:</span>
            <p className="font-medium">{formatDateTime(dispute.created_at)}</p>
          </div>
        </div>
        {dispute.evidences && dispute.evidences.length > 0 && (
          <div className="border-t pt-2">
            <MediaGallery files={dispute.evidences} title="Dispute Evidence" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== PROCESSING UI =====
function ProcessingUI({
  refund,
  onComplete,
  onCancel,
  user,
  setRefund
}: {
  refund: any;
  onComplete: () => void;
  onCancel: () => void;
  user: { id: string | number; isAdmin: boolean };
  setRefund: (value: any | ((prev: any) => any)) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const getPaymentDetail = () => refund.payment_details || refund.payment_detail || refund.paymentDetails || null;

  const renderSelectedPaymentDetails = () => {
    const pd = getPaymentDetail();
    if (!pd) return null;

    return (
      <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px]">Payment Method</span>
            <p className="font-medium capitalize">{pd.payment_method || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium">{pd.account_name || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">
                {showAccountNumber ? (pd.account_number || 'N/A') : (pd.masked_account_number || '••••' + String(pd.account_number || '').slice(-4))}
              </p>
              <button type="button" onClick={() => setShowAccountNumber(s => !s)} className="p-1 rounded hover:bg-gray-100">
                {showAccountNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {pd.bank_name && (
            <div>
              <span className="text-muted-foreground text-[10px]">Bank Name</span>
              <p className="font-medium">{pd.bank_name}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasProofs = () => (refund?.refund_media || []).filter((m: any) => m.is_proof).length > 0 || selectedProofFiles.length > 0;

  const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const validFiles = files.filter(f => {
      if (!f.type.startsWith('image/')) {
        toast({ title: 'Invalid file', description: `${f.name} is not an image`, variant: 'destructive' });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 5MB`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;
    setSelectedProofFiles(validFiles);
    setProofPreviews(validFiles.map(f => URL.createObjectURL(f)));
  };

  const removeProofFile = (index: number) => {
    setSelectedProofFiles(prev => prev.filter((_, i) => i !== index));
    setProofPreviews(prev => { const n = [...prev]; URL.revokeObjectURL(n[index]); n.splice(index, 1); return n; });
  };

  const handleCompleteRefund = async () => {
    const id = refund?.refund_id;
    if (!id) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }
    if (!hasProofs()) {
      toast({ title: 'Proof Required', description: 'Please upload proof of refund before completing', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedProofFiles.forEach(f => formData.append('file_data', f));
      formData.append('set_status', 'completed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`,
        formData,
        { headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'multipart/form-data' } }
      );

      toast({ title: 'Success', description: 'Refund marked as completed' });
      setSelectedProofFiles([]);
      setProofPreviews([]);
      setAdminNotes('');
      onComplete();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to complete refund', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsFailed = async () => {
    const id = refund?.refund_id;
    if (!id) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('set_status', 'failed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`,
        formData,
        { headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'multipart/form-data' } }
      );

      toast({ title: 'Success', description: 'Refund marked as failed' });
      setRefund((prev: any) => ({ ...prev, refund_payment_status: 'failed' }));
      onCancel();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to mark as failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvedAmount = refund.approved_refund_amount || refund.total_refund_amount || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <Wallet className="h-4 w-4" /> Refund Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-green-50/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Approved Amount</span>
              </div>
              <span className="text-xl font-bold text-green-600">{formatMoney(approvedAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <CreditCard className="h-4 w-4" /> Selected Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getPaymentDetail() ? (
            renderSelectedPaymentDetails()
          ) : (
            <p className="text-xs text-muted-foreground italic">No saved payment method selected for this refund.</p>
          )}
        </CardContent>
      </Card>

      <Card className={!hasProofs() ? "border-red-300" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className={`h-4 w-4 ${!hasProofs() ? 'text-red-500' : 'text-gray-600'}`} />
            Proof of Refund {!hasProofs() && <Badge className="bg-red-500 text-white text-[10px]">Required</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">Upload screenshot, receipt, or bank transfer confirmation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" multiple onChange={handleProofFileSelect} className="text-xs h-8" disabled={isSubmitting} />
          </div>
          {proofPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {proofPreviews.map((preview, index) => (
                <div key={index} className="relative w-16 h-16">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded border" />
                  <button type="button" onClick={() => removeProofFile(index)} className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border shadow-sm">
                    <XCircle className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {(refund.refund_media || []).filter((m: any) => m.is_proof).length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Uploaded Proofs ({(refund.refund_media || []).filter((m: any) => m.is_proof).length})</p>
              <div className="flex flex-wrap gap-2">
                {(refund.refund_media || []).filter((m: any) => m.is_proof).map((proof: any, index: number) => (
                  <div key={proof.id || index} className="relative w-16 h-16">
                    {proof.file_url?.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                      <img src={proof.file_url} alt={`Proof ${index + 1}`} className="w-full h-full object-cover rounded border" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center border rounded bg-gray-100">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!hasProofs() && (
            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>Proof required before completing refund</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="outline" size="sm" onClick={handleMarkAsFailed} disabled={isSubmitting} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          Mark Failed
        </Button>
        <Button size="sm" onClick={handleCompleteRefund} disabled={isSubmitting || !hasProofs()} className={hasProofs() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}>
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}
          {hasProofs() ? 'Complete Refund' : 'Proof Required'}
        </Button>
      </div>
    </div>
  );
}

// ===== LOADER =====
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }
  
  await requireRole(request, context, ["isAdmin"]);
  
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get('userId');

  const refundId = params?.refundId;
  if (!refundId) throw new Response('refund id required', { status: 400 });

  try {
    const detailResponse = await AxiosInstance.get(`/admin-refunds/${encodeURIComponent(String(refundId))}/full-details/`, {
      headers: { "X-User-Id": userId }
    });
    
    const fullDetails = detailResponse.data;
    
    const transformedRefund = {
      refund_id: fullDetails.refund_id,
      refund: fullDetails.refund_id,
      ...fullDetails.refund_details,
      order_id: fullDetails.order_details?.order,
      order_total_amount: fullDetails.order_details?.total_amount,
      order: fullDetails.order_details,
      products: fullDetails.product_details || [],
      refund_items: fullDetails.items || [],
      delivery_details: fullDetails.delivery_details,
      proof_media: fullDetails.proof_media,
      refund_media: fullDetails.refund_media,
      payment_details: fullDetails.payment_details,
      dispute_details: fullDetails.dispute_details,
      dispute_request: fullDetails.dispute_details,
      disputes: fullDetails.disputes || (fullDetails.dispute_details ? [fullDetails.dispute_details] : []),
      customer: fullDetails.order_details?.user,
      requested_by_username: fullDetails.order_details?.user?.username,
      requested_by_email: fullDetails.order_details?.user?.email,
      default_shipping_address: fullDetails.order_details?.shipping_address,
      status: fullDetails.refund_details?.status,
      refund_payment_status: fullDetails.refund_details?.refund_payment_status,
      requested_at: fullDetails.refund_details?.requested_at,
      processed_at: fullDetails.refund_details?.processed_at,
      total_refund_amount: fullDetails.refund_details?.total_refund_amount,
      approved_refund_amount: fullDetails.refund_details?.approved_refund_amount,
      amount_to_refund: fullDetails.refund_details?.amount_to_refund,
      preferred_refund_method: fullDetails.refund_details?.buyer_preferred_refund_method,
      final_refund_method: fullDetails.refund_details?.final_refund_method,
      reason: fullDetails.refund_details?.reason,
      detailed_reason: fullDetails.refund_details?.detailed_reason,
      customer_note: fullDetails.refund_details?.customer_note,
      refund_type: fullDetails.refund_details?.refund_type,
      reject_reason_code: fullDetails.refund_details?.reject_reason_code,
      reject_reason_details: fullDetails.refund_details?.reject_reason_details,
      refund_fee: fullDetails.refund_details?.refund_fee,
      processed_by: fullDetails.refund_details?.processed_by,
      buyer: fullDetails.order_details?.user,
    };
    
    return { user, refund: transformedRefund };
  } catch (err) {
    console.error('Failed to fetch full details', err);
  }

  throw new Response('Refund not found', { status: 404 });
}

// ===== MAIN COMPONENT =====
export default function AdminViewRefundDetails({ loaderData }: { loaderData: any }) {
  const { refund: initialRefund, user } = loaderData;
  const [refund, setRefund] = useState(initialRefund);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [refundType, setRefundType] = useState<'full' | 'partial' | 'no_refund' | ''>('');
  const [refundAmount, setRefundAmount] = useState<number>(Number(initialRefund.total_refund_amount ?? 0));
  const [selectedLiabilities, setSelectedLiabilities] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'50_50' | '70_30' | '30_70' | 'custom'>('50_50');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'reject' | 'confirm' | null>(null);
  const [modalAuthChecked, setModalAuthChecked] = useState(false);
  const [caseCategory, setCaseCategory] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeDispute = getActiveDispute(refund);
  const effectiveSt = (() => {
    const s = String(refund.status || '').toLowerCase();
    const disputeStatus = String(activeDispute?.status || '').toLowerCase();
    if (['under_review', 'investigating', 'in_review'].includes(disputeStatus) && s === 'dispute') return 'under_review';
    if (refund.refund_payment_status === 'completed' && s === 'approved') return 'completed';
    return s;
  })();

  // Auto-select liability based on case category
  useEffect(() => {
    if (!caseCategory) return;
    
    const categoryToLiabilityMap: Record<string, string[]> = {
      'merchant_fulfillment_issue': ['seller'],
      'logistics_delivery_issue': ['rider'],
      'customer_related_issue': ['buyer'],
      'shared_responsibility': []
    };
    
    const autoSelectedLiability = categoryToLiabilityMap[caseCategory];
    if (autoSelectedLiability && autoSelectedLiability.length > 0) {
      setSelectedLiabilities(autoSelectedLiability);
      setSplitType('50_50');
      setCustomSplits({});
    } else {
      // For shared_responsibility, clear selections to let user choose
      setSelectedLiabilities([]);
      setSplitType('50_50');
      setCustomSplits({});
    }
  }, [caseCategory]);

  const handleProcessRefund = async () => {
    const id = refund?.refund_id;
    if (!id) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      return;
    }
    
    setProcessing(true);
    try {
      const response = await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`,
        { set_status: 'processing' },
        { headers: { 'X-User-Id': String(user?.id || '') } }
      );
      
      if (response.data.success) {
        toast({ title: 'Success', description: 'Refund processing started.' });
        setRefund((prev: any) => ({ 
          ...prev, 
          refund_payment_status: response.data.refund_payment_status,
          ...(response.data.payment_details ? { payment_details: response.data.payment_details, payment_detail: response.data.payment_details } : {}),
        }));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to process refund', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartReview = async () => {
    const disputeId = activeDispute?.id;
    if (!disputeId) {
      toast({ title: 'Error', description: 'No active dispute found for this refund', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      await AxiosInstance.post(`/disputes/${disputeId}/start_review/`, null, {
        headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'application/json' }
      });

      toast({ title: 'Review started', description: 'Dispute marked under review.' });
      setRefund((prev: any) => ({ 
        ...prev, 
        status: 'under_review',
        dispute_details: { ...prev.dispute_details, status: 'under_review' }
      }));
    } catch (err: any) {
      toast({ title: 'Failed to start review', description: err.response?.data?.error || err.message || 'Unknown error occurred', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmProcessRefund = async () => {
    if (!selectedLiabilities.length) {
      toast({ title: 'Error', description: 'Please select liability distribution.', variant: 'destructive' });
      return;
    }
    if (!refundType) {
      toast({ title: 'Error', description: 'Please select full or partial refund.', variant: 'destructive' });
      return;
    }
    if (refundType === 'partial' && (!refundAmount || refundAmount <= 0)) {
      toast({ title: 'Error', description: 'Please enter a valid partial refund amount.', variant: 'destructive' });
      return;
    }
    if (selectedLiabilities.length > 1 && splitType === 'custom') {
      const total = Object.values(customSplits).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total !== 100) {
        toast({ title: 'Error', description: 'Custom split must total 100%.', variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const disputeId = activeDispute?.id;
      if (!disputeId) {
        toast({ title: 'Error', description: 'No active dispute found', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      let distribution: Record<string, number> = {};
      if (selectedLiabilities.length === 1) {
        distribution[selectedLiabilities[0]] = 100;
      } else if (splitType === '50_50') {
        distribution[selectedLiabilities[0]] = 50;
        distribution[selectedLiabilities[1]] = 50;
      } else if (splitType === '70_30') {
        distribution[selectedLiabilities[0]] = 70;
        distribution[selectedLiabilities[1]] = 30;
      } else if (splitType === '30_70') {
        distribution[selectedLiabilities[0]] = 30;
        distribution[selectedLiabilities[1]] = 70;
      } else if (splitType === 'custom') {
        distribution = customSplits;
      }

      const approveData = {
        refund_id: refund.refund_id,
        dispute_id: disputeId,
        decision: 'approve',
        refund_type: refundType,
        adjusted_amount: refundAmount,
        liability_distribution: distribution,
        case_category: caseCategory,
        admin_notes: `Approved ${refundType} refund of ₱${refundAmount.toFixed(2)}. Liability: ${JSON.stringify(distribution)}`
      };

      const response = await AxiosInstance.post('/disputes/approve_refund/', approveData, {
        headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'application/json' }
      });

      if (response.data) {
        toast({ title: 'Success', description: `Refund ${refundType === 'full' ? 'fully' : 'partially'} approved.` });
        setRefund((prev: any) => ({
          ...prev,
          status: 'approved',
          approved_refund_amount: refundAmount,
          refund_details: { ...prev.refund_details, status: 'approved', approved_refund_amount: refundAmount }
        }));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to approve refund', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDispute = async () => {
    setProcessing(true);
    try {
      const disputeId = activeDispute?.id;
      if (!disputeId) {
        toast({ title: 'Error', description: 'No active dispute found', variant: 'destructive' });
        return;
      }

      await AxiosInstance.post(`/disputes/${disputeId}/reject/`, { admin_notes: 'Rejected by admin' }, {
        headers: { 'X-User-Id': String(user?.id || '') }
      });

      toast({ title: 'Rejected', description: 'Dispute has been rejected.' });
      setRefund((prev: any) => ({ ...prev, status: 'rejected' }));
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to reject dispute', variant: 'destructive' });
    } finally {
      setProcessing(false);
      setAuthAction(null);
      setModalAuthChecked(false);
    }
  };

  const getCustomSplitTotal = () => Object.values(customSplits).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleLiabilityChange = (id: string) => {
    // Prevent changing auto-selected liability from non-shared categories
    const isAutoSelectedFromNonShared = ['merchant_fulfillment_issue', 'logistics_delivery_issue', 'customer_related_issue'].includes(caseCategory) && selectedLiabilities.includes(id) && selectedLiabilities.length === 1;
    
    if (isAutoSelectedFromNonShared) {
      toast({ title: 'Cannot Change', description: 'This liability is automatically selected based on the case category.', variant: 'default' });
      return;
    }

    setSelectedLiabilities(prev => {
      if (prev.includes(id)) {
        const newList = prev.filter(x => x !== id);
        setSplitType('50_50');
        setCustomSplits({});
        return newList;
      } else {
        if (prev.length >= 2) {
          toast({ title: 'Limit reached', description: 'You can only select up to 2 parties for liability distribution.', variant: 'default' });
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleCustomSplitChange = (id: string, value: string) => {
    setCustomSplits(prev => ({ ...prev, [id]: value === '' ? 0 : Number(value) }));
  };

  const refundDetails = {
    reason: refund.reason,
    detailed_reason: refund.detailed_reason,
    customer_note: refund.customer_note,
    total_refund_amount: refund.total_refund_amount,
    preferred_refund_method: refund.preferred_refund_method,
    status: refund.status,
    reject_reason_code: refund.reject_reason_code,
    reject_reason_details: refund.reject_reason_details,
  };

  const refundMedia = refund.refund_media || [];
  const orderInfo = refund.order_details || refund.order;
  const productItems = refund.products || [];
  const shippingAddress = refund.default_shipping_address || refund.order_details?.shipping_address;

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
                Refund #{refund?.refund_id ? String(refund.refund_id).slice(0, 8) : 'N/A'}
                <StatusBadge status={effectiveSt} />
                {activeDispute?.status === 'under_review' && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 ml-2">
                    <Scale className="h-3 w-3 mr-1" /> Under Review
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">Admin investigation view — complete refund details for case review</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Requested: {formatDateTime(refund.requested_at)}</div>
              {refund.processed_at && <div>Processed: {formatDateTime(refund.processed_at)}</div>}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {refund.refund_payment_status === 'processing' && effectiveSt === 'approved' ? (
            <ProcessingUI refund={refund} onComplete={() => window.location.reload()} onCancel={() => window.location.reload()} user={user} setRefund={setRefund} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-2 space-y-4">
                {/* Status Banner */}
                <div className={`${statusConfig[effectiveSt]?.color || 'bg-gray-50'} border rounded-md p-3`}>
                  <div className="flex items-center gap-2">
                    {statusConfig[effectiveSt]?.icon && React.createElement(statusConfig[effectiveSt].icon, { className: "h-4 w-4" })}
                    <span className="text-sm font-medium">{statusConfig[effectiveSt]?.label || effectiveSt}</span>
                    <span className="text-xs">{statusConfig[effectiveSt]?.description || ''}</span>
                  </div>
                </div>

                {/* Buyer Request Card */}
                <BuyerRequestCard refundMedia={refundMedia} refundDetails={refundDetails} />

                {/* Seller Response Card */}
                <SellerResponseCard refundMedia={refundMedia} refundDetails={refundDetails} />

                {/* Dispute Details */}
                {activeDispute && <DisputeDetailsCard dispute={activeDispute} />}

                {/* Refund Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Refund Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-xs text-muted-foreground block">Refund ID</span><p className="font-mono text-xs">{refund.refund_id || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Order ID</span><p className="font-medium">{orderInfo?.order || refund.order_id || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Reason</span><p className="font-medium">{refund.reason || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Refund Type</span><p className="font-medium capitalize">{refund.refund_type || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Order Total</span><p className="font-medium">{formatMoney(orderInfo?.total_amount || refund.order_total_amount)}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Requested Refund</span><p className="font-medium text-blue-600">{formatMoney(refund.total_refund_amount)}</p></div>
                      {refund.approved_refund_amount && (
                        <div><span className="text-xs text-muted-foreground block">Approved Amount</span><p className="font-medium text-green-600">{formatMoney(refund.approved_refund_amount)}</p></div>
                      )}
                      <div><span className="text-xs text-muted-foreground block">Preferred Method</span><p className="font-medium capitalize">{refund.preferred_refund_method || refund.buyer_preferred_refund_method || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Final Method</span><p className="font-medium capitalize">{refund.final_refund_method || 'N/A'}</p></div>
                      <div><span className="text-xs text-muted-foreground block">Payment Status</span><p className="font-medium capitalize">{refund.refund_payment_status || 'N/A'}</p></div>
                    </div>
                    {refund.detailed_reason && (
                      <div className="border-t pt-2"><span className="text-xs text-muted-foreground block">Detailed Reason</span><p className="text-sm mt-1">{refund.detailed_reason}</p></div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-xs text-muted-foreground block">Username</span><p className="font-medium">{orderInfo?.user?.username || refund.requested_by_username || 'N/A'}</p></div>
                    <div><span className="text-xs text-muted-foreground block">Email</span><p className="font-medium flex items-center gap-1"><Mail className="h-3 w-3" />{orderInfo?.user?.email || refund.requested_by_email || 'N/A'}</p></div>
                    <div><span className="text-xs text-muted-foreground block">Contact Number</span><p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{orderInfo?.user?.contact_number || 'N/A'}</p></div>
                  </CardContent>
                </Card>

                {/* Products */}
                {productItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Products ({productItems.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {productItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3 border-b pb-3 last:border-0">
                          {item.image && <div className="w-16 h-16 rounded overflow-hidden border bg-gray-50 flex-shrink-0"><img src={item.image} alt={item.name} className="w-full h-full object-cover" /></div>}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">Quantity: {item.quantity}</span>
                              <span className="text-sm font-semibold">{formatMoney(item.price)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">Subtotal:</span>
                              <span className="text-xs font-medium">{formatMoney(item.item_total_amount || item.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* RIGHT COLUMN - Admin Actions */}
              <aside className="space-y-3">
                <Card className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Admin Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {effectiveSt === 'dispute' && (
                      <Button size="sm" className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700" onClick={handleStartReview} disabled={processing}>
                        <Scale className="w-3 h-3 mr-1" /> Start Review
                      </Button>
                    )}

                    {effectiveSt === 'approved' && refund.refund_payment_status === 'pending' && (
                      <Button size="sm" className="w-full text-xs h-8 bg-green-600 hover:bg-green-700" onClick={handleProcessRefund} disabled={processing}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Process Refund
                      </Button>
                    )}

                    {effectiveSt === 'under_review' && (
                      <>
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Case Category</p>
                          <div className="space-y-1">
                            {[
                              { id: 'merchant_fulfillment_issue', label: 'Merchant Fulfillment Issue (Seller)' },
                              { id: 'logistics_delivery_issue', label: 'Logistics / Delivery Issue (Delivery Partner)' },
                              { id: 'customer_related_issue', label: 'Customer-Related Issue (Customer)' },
                              { id: 'shared_responsibility', label: 'Shared Responsibility' },
                              { id: 'platform_system_issue', label: 'Platform / System Issue' }
                            ].map(option => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <input type="radio" id={`case_${option.id}`} name="case_category" value={option.id} checked={caseCategory === option.id} onChange={() => setCaseCategory(option.id)} className="h-3 w-3" />
                                <Label htmlFor={`case_${option.id}`} className="text-xs cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Refund Decision</p>
                          <div className="space-y-1">
                            {(() => {
                              const options: Array<'full' | 'partial' | 'no_refund'> = ['full', 'partial'];
                              if (caseCategory === 'customer_related_issue') {
                                options.push('no_refund');
                              }
                              return options.map(type => (
                                <div key={type} className="flex items-center space-x-2">
                                  <input type="radio" id={`${type}_refund`} name="refund_type" value={type} checked={refundType === type} onChange={e => { setRefundType(e.target.value as 'full' | 'partial' | 'no_refund'); if (e.target.value === 'full') setRefundAmount(Number(refund.total_refund_amount) || 0); }} className="h-3 w-3" />
                                  <Label htmlFor={`${type}_refund`} className="text-xs cursor-pointer capitalize">{type === 'no_refund' ? 'No Refund' : `${type} Refund`}</Label>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        {refundType && refundType !== 'no_refund' && (
                          <div className="space-y-1 mb-3">
                            <Label htmlFor="refund_amount" className="text-xs">Amount {refundType === 'full' && '(Full)'}</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                              <Input id="refund_amount" type="number" step="0.01" min="0" max={refund.total_refund_amount || 0} value={refundAmount} onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)} disabled={refundType === 'full'} className="pl-6 text-xs h-7" />
                            </div>
                          </div>
                        )}

                        {refundType === 'no_refund' && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-yellow-700">
                                <p className="font-medium">No Refund Decision</p>
                                <p className="mt-1">The customer will not receive any refund. The order dispute will be resolved without monetary compensation.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-t pt-2 mt-1 mb-3">
                          <p className="text-xs font-medium mb-2 flex items-center gap-1"><Scale className="h-3 w-3" /> Liability Distribution</p>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              {[
                                { id: 'buyer', label: 'Buyer' },
                                { id: 'seller', label: 'Seller' },
                                { id: 'rider', label: 'Rider' }
                              ].map(option => {
                                // Check if this is auto-selected based on case category
                                const isAutoSelected = ['merchant_fulfillment_issue', 'logistics_delivery_issue', 'customer_related_issue'].includes(caseCategory) && 
                                  ((caseCategory === 'merchant_fulfillment_issue' && option.id === 'seller') ||
                                   (caseCategory === 'logistics_delivery_issue' && option.id === 'rider') ||
                                   (caseCategory === 'customer_related_issue' && option.id === 'buyer'));
                                
                                return (
                                  <div key={option.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`liability_${option.id}`} 
                                      checked={selectedLiabilities.includes(option.id)} 
                                      onCheckedChange={() => handleLiabilityChange(option.id)} 
                                      disabled={isAutoSelected}
                                      className="h-3 w-3" 
                                    />
                                    <Label 
                                      htmlFor={`liability_${option.id}`} 
                                      className={`text-xs cursor-pointer ${isAutoSelected ? 'text-muted-foreground' : ''}`}
                                    >
                                      {option.label}
                                      {isAutoSelected && <span className="ml-1 text-[10px] text-blue-600 font-medium">(Auto-selected)</span>}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>

                            {selectedLiabilities.length === 2 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-medium mb-2">Split Type</p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {['50_50', '70_30', '30_70', 'custom'].map(type => (
                                    <label key={type} className="flex items-center gap-1 text-xs">
                                      <input type="radio" name="splitType" checked={splitType === type} onChange={() => setSplitType(type as any)} className="h-3 w-3" />
                                      {type === '50_50' ? '50/50' : type === '70_30' ? '70/30' : type === '30_70' ? '30/70' : 'Custom'}
                                    </label>
                                  ))}
                                </div>

                                {splitType === 'custom' && (
                                  <div className="space-y-1 mt-1">
                                    {selectedLiabilities.map(id => {
                                      const partyLabel = id === 'buyer' ? 'Buyer' : id === 'seller' ? 'Seller' : 'Rider';
                                      return (
                                        <div key={id} className="flex items-center gap-2 text-xs">
                                          <span className="w-16">{partyLabel}:</span>
                                          <div className="relative w-16">
                                            <Input type="number" min="0" max="100" step="1" value={customSplits[id] || 0} onChange={e => handleCustomSplitChange(id, e.target.value)} className="text-xs h-6 pr-5" />
                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">%</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {getCustomSplitTotal() !== 100 && <p className="text-[9px] text-red-500">Total: {getCustomSplitTotal()}% (must be 100%)</p>}
                                  </div>
                                )}

                                {splitType !== 'custom' && (
                                  <div className="bg-purple-50 rounded p-1.5 text-[10px] mt-1">
                                    <p className="font-medium text-purple-700 mb-0.5">Preview:</p>
                                    {selectedLiabilities.map((id, idx) => {
                                      let pct = splitType === '50_50' ? 50 : (splitType === '70_30' ? (idx === 0 ? 70 : 30) : (idx === 0 ? 30 : 70));
                                      const partyLabel = id === 'buyer' ? 'Buyer' : id === 'seller' ? 'Seller' : 'Rider';
                                      return <div key={id} className="flex justify-between"><span>{partyLabel}:</span><span>{pct}% (₱{((refundAmount * pct) / 100).toFixed(2)})</span></div>;
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {selectedLiabilities.length === 1 && (
                              <div className="bg-green-50 border border-green-200 rounded p-1.5 mt-2">
                                <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /><span className="text-[10px] font-medium text-green-700">100% Liability on {selectedLiabilities[0] === 'buyer' ? 'Buyer' : selectedLiabilities[0] === 'seller' ? 'Seller' : 'Rider'}</span></div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <Button size="sm" variant="destructive" className="w-full text-xs h-7" disabled={!selectedLiabilities.length || !refundType} onClick={() => { setAuthAction('reject'); setModalAuthChecked(false); setShowAuthModal(true); }}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject Dispute
                          </Button>
                          <Button size="sm" className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700" disabled={!selectedLiabilities.length || !refundType || refundType === 'no_refund' || isSubmitting} onClick={() => { setAuthAction('confirm'); setModalAuthChecked(false); setShowAuthModal(true); }}>
                            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : refundType === 'no_refund' ? 'Confirm No Refund' : 'Approve & Process Refund'}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorization Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authAction === 'reject' ? 'Confirm Rejection' : 'Authorize Approval'}</DialogTitle>
            <DialogDescription>
              {authAction === 'reject'
                ? 'Are you sure you want to reject this dispute? This action cannot be undone.'
                : `Please confirm you authorize approving a ${refundType?.toUpperCase()} refund of ₱${refundAmount.toFixed(2)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <div className="flex items-start space-x-2">
              <Checkbox id="modal-auth" checked={modalAuthChecked} onCheckedChange={v => setModalAuthChecked(v === true)} className="h-3 w-3 mt-0.5" />
              <Label htmlFor="modal-auth" className="text-[12px] text-muted-foreground leading-tight">
                I hereby declare that I have reviewed the refund case thoroughly and determined the responsible party. I authorize the {refundType} refund of ₱{refundAmount.toFixed(2)}.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthModal(false)}>Cancel</Button>
            <Button disabled={!modalAuthChecked} onClick={async () => {
              setShowAuthModal(false);
              if (authAction === 'reject') {
                await handleRejectDispute();
              } else if (authAction === 'confirm') {
                await handleConfirmProcessRefund();
              }
              setAuthAction(null);
              setModalAuthChecked(false);
            }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiation Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proceed with refund?</DialogTitle>
            <DialogDescription>This refund is currently under negotiation. Processing it now will bypass or close the negotiation. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button onClick={() => { setShowConfirmModal(false); handleProcessRefund(); }}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}