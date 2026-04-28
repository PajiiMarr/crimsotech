"use client";

import React, { useState } from 'react';
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
} from 'lucide-react';
import type { Route } from './+types/view-refund-details';

export function meta(): Route.MetaDescriptors {
  return [{ title: "View Refund - Admin" }];
}

// ===== STATUS CONFIGURATION =====
const statusConfig = {
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

// ===== HELPER FUNCTIONS =====
const formatMoney = (value: unknown) => {
  try {
    const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(num);
  } catch { return '—'; }
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

// ===== COMPLETED UI STATUS (When refund.refund_payment_status = 'completed') =====
function CompletedRefundView({ refund, user }: { 
  refund: any; 
  user: any; 
}) {
  const navigate = useNavigate();

  // Get payment detail for display
  const getPaymentDetail = () => {
    if (refund.payment_details) return refund.payment_details;
    if (refund.payment_detail) return refund.payment_detail;
    if (refund.paymentDetails) return refund.paymentDetails;
    return null;
  };

  const renderPaymentDetails = () => {
    const pd = getPaymentDetail();
    if (!pd) return null;

    const paymentMethod = pd.payment_method ? String(pd.payment_method).toLowerCase() : '';
    let providerDisplay = '';
    switch (paymentMethod) {
      case 'gcash': providerDisplay = 'GCash'; break;
      case 'paymaya': providerDisplay = 'PayMaya'; break;
      case 'bank': providerDisplay = 'Bank Transfer'; break;
      case 'remittance': providerDisplay = 'Remittance'; break;
      default: providerDisplay = paymentMethod || 'Wallet';
    }

    return (
      <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px]">Payment Method</span>
            <p className="font-medium capitalize">{providerDisplay}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium">{pd.account_name || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <p className="font-mono text-sm">{pd.masked_account_number || '••••' + String(pd.account_number || '').slice(-4)}</p>
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

  const approvedAmount = refund.approved_refund_amount || refund.amount_to_refund || 0;
  const processedAt = refund.processed_at || refund.refund_details?.processed_at;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" className="mb-4" onClick={() => window.location.href = '/admin/refunds'}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Refunds
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Refund #{refund?.refund_id ? String(refund.refund_id).slice(0, 8) : 'N/A'}
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>
              </CardTitle>
              <CardDescription className="text-xs">This refund has been successfully completed</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Requested: {formatDateTime(refund.requested_at)}
              {processedAt && <div>Completed: {formatDateTime(processedAt)}</div>}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Completion Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Refund Completed Successfully</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      The refund amount of {formatMoney(approvedAmount)} has been processed 
                      {processedAt && ` on ${formatDateTime(processedAt)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Buyer Information */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Buyer Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Username</span>
                    <p className="font-medium">{refund.buyer?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Contact Number</span>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {refund.buyer?.contact_number || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {refund.buyer?.email || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Refunded */}
              <div className="border rounded-lg bg-emerald-50/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Amount Refunded</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-600">{formatMoney(approvedAmount)}</span>
                </div>
              </div>

              {/* Products */}
              {refund.products && refund.products.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Products ({refund.products.length})</span>
                  </div>
                  <div className="space-y-3">
                    {refund.products.map((product: any, idx: number) => (
                      <div key={idx} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="w-16 h-16 rounded overflow-hidden border bg-gray-50 flex-shrink-0">
                          {product.product_image ? (
                            <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.product_name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">Quantity: {product.quantity}</span>
                            <span className="text-sm font-semibold text-emerald-600">{formatMoney(product.price)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">Subtotal:</span>
                            <span className="text-xs font-medium">{formatMoney(product.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Refund Reason</span>
                </div>
                <p className="text-sm">{refund.reason || 'No reason provided'}</p>
              </div>
            </div>

            {/* Right Column - Payment Summary */}
            <aside className="space-y-4">
              <Card className="border shadow-none">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Refund Amount</span>
                    <span className="text-sm font-semibold text-emerald-600">{formatMoney(approvedAmount)}</span>
                  </div>
                  {refund.refund_fee && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Processing Fee</span>
                      <span className="text-sm text-red-500">-{formatMoney(refund.refund_fee)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Net Refund</span>
                      <span className="text-base font-bold text-emerald-600">
                        {formatMoney(Math.max(0, Number(approvedAmount) - (refund.refund_fee || 0)))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Card */}
              {getPaymentDetail() && (
                <Card className="border shadow-none">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Refund Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {renderPaymentDetails()}
                  </CardContent>
                </Card>
              )}

              {/* Processed By Card */}
              {refund.processed_by && (
                <Card className="border shadow-none">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Processed By
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm font-medium">{refund.processed_by?.username || 'Admin'}</p>
                    {refund.processed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(refund.processed_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== PROCESSING UI FOR APPROVED REFUND (When refund.refund_payment_status = 'processing') =====
// ===== PROCESSING UI FOR APPROVED REFUND (When refund.refund_payment_status = 'processing') =====
function ApprovedProcessingUI({
  refund,
  onComplete,
  onCancel,
  user,
}: {
  refund: any;
  onComplete: () => void;
  onCancel: () => void;
  user: { id: string | number; isAdmin: boolean };
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Get payment detail from refund - check all possible locations
  const getPaymentDetail = () => {
    // Check in various possible locations
    if (refund.payment_details) return refund.payment_details;
    if (refund.payment_detail) return refund.payment_detail;
    if (refund.paymentDetails) return refund.paymentDetails;
    return null;
  };

  const renderCustomerWalletDetails = () => {
    const pd = getPaymentDetail();
    
    if (!pd) {
      return (
        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground">No wallet/payment method found</p>
        </div>
      );
    }

    // Determine wallet provider display name
    let providerDisplay = '';
    const paymentMethod = pd.payment_method ? String(pd.payment_method).toLowerCase() : '';
    
    switch (paymentMethod) {
      case 'gcash':
        providerDisplay = 'GCash';
        break;
      case 'paymaya':
        providerDisplay = 'PayMaya';
        break;
      case 'bank':
        providerDisplay = 'Bank Transfer';
        break;
      case 'remittance':
        providerDisplay = 'Remittance';
        break;
      default:
        providerDisplay = paymentMethod || 'Wallet';
    }

    // Get account number display
    const accountNumber = pd.account_number || 'N/A';
    const maskedAccountNumber = pd.masked_account_number || (accountNumber !== 'N/A' ? String(accountNumber).replace(/\d(?=\d{4})/g, '*') : 'N/A');

    return (
      <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px]">Payment Method</span>
            <p className="font-medium capitalize">{providerDisplay}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium">{pd.account_name || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">
                {showAccountNumber ? accountNumber : maskedAccountNumber}
              </p>
              <button
                type="button"
                onClick={() => setShowAccountNumber(s => !s)}
                className="p-1 rounded hover:bg-gray-100"
              >
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
          {/* {pd.is_default !== undefined && (
            <div>
              <span className="text-muted-foreground text-[10px]">Default</span>
              <p className="font-medium">{pd.is_default ? 'Yes' : 'No'}</p>
            </div>
          )} */}
        </div>
      </div>
    );
  };

  const hasProofs = () => selectedProofFiles.length > 0;

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
      if (proofNotes) formData.append('notes', proofNotes);
      formData.append('set_status', 'completed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`,
        formData,
        { headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'multipart/form-data' } }
      );

      toast({ title: 'Success', description: 'Refund marked as completed' });
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
      onCancel();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to mark as failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvedAmount = refund.approved_refund_amount || refund.amount_to_refund || 0;

  return (
    <div className="space-y-4">
      {/* Refund Processing Card - Amount only */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium">Approved Amount</span>
          </div>
          <span className="text-base font-semibold text-green-600">{formatMoney(approvedAmount)}</span>
        </div>
      </div>

      {/* Customer Wallet Details Card */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium">Customer Payment Method</span>
        </div>
        {renderCustomerWalletDetails()}
      </div>

      {/* Proof of Refund Card - Smaller Box Style Upload */}
      <div className={`border rounded-lg p-3 ${!hasProofs() ? 'border-red-300' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <Camera className={`h-4 w-4 ${!hasProofs() ? 'text-red-500' : 'text-gray-600'}`} />
          <span className="text-xs font-medium">Proof of Refund {!hasProofs() && <Badge className="bg-red-500 text-white text-[9px] ml-2">Required</Badge>}</span>
        </div>
        
        {/* Smaller Box Style Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-gray-400 transition-colors cursor-pointer" onClick={() => document.getElementById('proof-upload')?.click()}>
          <Input 
            id="proof-upload"
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleProofFileSelect} 
            className="hidden" 
          />
          <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Click to upload proof</p>
          <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, GIF up to 5MB</p>
        </div>
        
        {proofPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {proofPreviews.map((preview, index) => (
              <div key={index} className="relative w-12 h-12">
                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded border" />
                <button onClick={() => removeProofFile(index)} className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">
                  <XCircle className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {!hasProofs() && (
          <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 p-1.5 rounded mt-2">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>Proof required before completing refund</span>
          </div>
        )}
      </div>

      {/* Admin Notes Card */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-medium">Admin Notes</span>
        </div>
        <textarea
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          placeholder="Add notes about the refund processing..."
          className="w-full border rounded-md p-2 text-xs min-h-[50px]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
          onClick={handleMarkAsFailed}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          Mark Failed
        </Button>
        <Button
          size="sm"
          className={`flex-1 text-xs h-8 ${hasProofs() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
          onClick={handleCompleteRefund}
          disabled={isSubmitting || !hasProofs()}
        >
          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}
          {hasProofs() ? 'Complete' : 'Proof Required'}
        </Button>
      </div>
    </div>
  );
}

// ===== SIMPLE APPROVED REFUND VIEW (When refund.refund_payment_status = 'pending') =====
function SimpleApprovedRefundView({ refund, user, onProcessRefund }: { 
  refund: any; 
  user: any; 
  onProcessRefund: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

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
        // Refresh the page to show processing UI
        window.location.reload();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to process refund', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Refund #{refund?.refund_id ? String(refund.refund_id).slice(0, 8) : 'N/A'}
                <Badge className="bg-green-100 text-green-700">Approved</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Review refund details and process payment</CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Requested: {formatDateTime(refund.requested_at)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Refund Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Buyer Information */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Buyer Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Username</span>
                    <p className="font-medium">{refund.buyer?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Contact Number</span>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {refund.buyer?.contact_number || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {refund.buyer?.email || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount to Refund */}
              <div className="border rounded-lg bg-green-50/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Amount to Refund</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{formatMoney(refund.amount_to_refund)}</span>
                </div>
              </div>

              {/* Products */}
              {refund.products && refund.products.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Products ({refund.products.length})</span>
                  </div>
                  <div className="space-y-3">
                    {refund.products.map((product: any, idx: number) => (
                      <div key={idx} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="w-16 h-16 rounded overflow-hidden border bg-gray-50 flex-shrink-0">
                          {product.product_image ? (
                            <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.product_name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">Quantity: {product.quantity}</span>
                            <span className="text-sm font-semibold text-green-600">{formatMoney(product.price)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">Subtotal:</span>
                            <span className="text-xs font-medium">{formatMoney(product.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Refund Reason</span>
                </div>
                <p className="text-sm">{refund.reason || 'No reason provided'}</p>
              </div>
            </div>

            {/* Right Column - Admin Actions */}
            <aside className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Admin Actions</span>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleProcessRefund}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Process Refund
                </Button>
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>
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

  const url = new URL(request.url);
  const refundId = params?.refundId || url.searchParams.get('refund_id') || url.searchParams.get('refund');
  if (!refundId) throw new Response('refund id required', { status: 400 });

  // First, get the refund status to determine which endpoint to use
  try {
    const listResponse = await AxiosInstance.get('/admin-refunds/refund_list/', {
      headers: { "X-User-Id": userId }
    });
    
    const refunds = Array.isArray(listResponse.data) ? listResponse.data : [];
    const found = refunds.find((r: any) => String(r.refund_id) === String(refundId));
    
    // If refund is approved, get approved details
    if (found && found.status === 'approved') {
      const detailResponse = await AxiosInstance.get(`/admin-refunds/${encodeURIComponent(String(refundId))}/approved-details/`, {
        headers: { "X-User-Id": userId }
      });
      
      // Check if refund_payment_status is 'processing'
      const isProcessing = found.refund_payment_status === 'processing';
      
      return { 
        user, 
        refund: detailResponse.data,
        refundPaymentStatus: found.refund_payment_status || 'pending',
        isProcessingView: isProcessing
      };
    }
  } catch (err) {
    console.error('Failed to check refund status', err);
  }

  // Fallback to full details for non-approved refunds
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
      products: fullDetails.product_details,
      delivery_details: fullDetails.delivery_details,
      proof_media: fullDetails.proof_media,
      refund_media: fullDetails.refund_media,
      payment_details: fullDetails.payment_details,
      dispute_details: fullDetails.dispute_details,
      dispute_request: fullDetails.dispute_details,
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
    };
    
    return { user, refund: transformedRefund, isApprovedView: false };
  } catch (err) {
    console.error('Failed to fetch full details', err);
  }

  throw new Response('Refund not found', { status: 404 });
}

// ===== MAIN COMPONENT =====
// ===== MAIN COMPONENT =====
export default function AdminViewRefundDetails({ loaderData }: { loaderData: any }) {
  const { user, refund: initialRefund, isProcessingView, refundPaymentStatus } = loaderData;
  
  // If refund payment status is completed, show completed UI
  if (refundPaymentStatus === 'completed') {
    return <CompletedRefundView refund={initialRefund} user={user} />;
  }
  
  // If this is a processing view, show the processing UI
  if (isProcessingView) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Refund #{initialRefund?.refund_id ? String(initialRefund.refund_id).slice(0, 8) : 'N/A'}
                  <Badge className="bg-blue-100 text-blue-700">Processing</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Complete the refund payment process</CardDescription>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Requested: {formatDateTime(initialRefund.requested_at)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ApprovedProcessingUI
              refund={initialRefund}
              user={user}
              onComplete={() => window.location.href = '/admin/refunds'}
              onCancel={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Otherwise, render the simple approved view
  return (
    <SimpleApprovedRefundView 
      refund={initialRefund} 
      user={user} 
      onProcessRefund={() => {}}
    />
  );
}