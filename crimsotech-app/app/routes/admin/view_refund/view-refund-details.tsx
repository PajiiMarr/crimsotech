"use client";

import React, { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';

// ===== TYPE DEFINITIONS =====
interface RefundFlat {
  refund: string;
  refund_id?: string;
  status?: string;
  reason?: string;
  requested_by_username?: string;
  requested_by_email?: string;
  order_id?: string;
  order_total_amount?: number | string;
  total_refund_amount?: number | string;
  approved_refund_amount?: number | string;
  preferred_refund_method?: string;
  final_refund_method?: string;
  refund_method?: string;
  refund_payment_status?: string;
  payment_refund_status?: string;
  payment_status?: string;
  paymentRefundStatus?: string;
  requested_at?: string;
  processed_at?: string;
  processed_by_username?: string;
  dispute_reason?: string;
  logistic_service?: string;
  tracking_number?: string;
  has_media?: boolean;
  media_count?: number;
  order?: any;
  default_shipping_address?: any;
  [key: string]: any;
}

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
  FileText, ShoppingBag, CreditCard, DollarSign, Shield, Camera,
  Scale, Gavel, Search, Loader2, Send, AlertCircle, Info,
  MapPin, Phone, Mail, Store, Bike, Package as PackageIcon,
  Image as ImageIcon, File as FileIcon, Download, ExternalLink,
  History, Tag, Receipt, Building, Globe, Star, ThumbsUp, ThumbsDown,
  Flag, HelpCircle, ClipboardList, Box, Layers, Truck as TruckIcon,
  UserCheck, UserX, ShieldCheck, Timer, DollarSign as MoneyIcon,
  MessageSquare, Store as StoreIcon, User as UserIcon, ImagePlus
} from 'lucide-react';
import type { Route } from './+types/view-refund-details';

// ===== LIABILITY LABELS MAPPING =====
const liabilityLabels: Record<string, string> = {
  'merchant_fulfillment_issue': 'Merchant Fulfillment Issue (Seller)',
  'logistics_delivery_issue': 'Logistics / Delivery Issue (Delivery Partner)',
  'customer_related_issue': 'Customer-Related Issue (Customer)',
  'shared_responsibility': 'Shared Responsibility',
  'platform_system_issue': 'Platform / System Issue'
};

export function meta(): Route.MetaDescriptors {
  return [{ title: "View Refund - Admin Investigation" }];
}

const getRefundId = (refund: any) => {
  if (!refund) return null;
  return refund.refund_id || refund.refund || refund.id;
};

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

function getActiveDispute(refund: RefundFlat & { [key: string]: any }) {
  if (refund.dispute_details && Object.keys(refund.dispute_details).length > 0) return refund.dispute_details;
  if (refund.dispute_request && Object.keys(refund.dispute_request).length > 0) return refund.dispute_request;
  if (Array.isArray(refund.disputes) && refund.disputes.length > 0) {
    return refund.disputes.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];
  }
  return null;
}

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

// ===== MEDIA GALLERY =====
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

// ===== DELIVERY MEDIA CARD =====
function DeliveryMediaCard({ proofs }: { proofs: any[] }) {
  const deliveryProofs = proofs.filter(p => p.proof_type === 'delivery');
  if (deliveryProofs.length === 0) return null;
  
  return (
    <div className="mt-2 pt-2 border-t">
      <span className="text-xs font-medium flex items-center gap-1 mb-2">
        <Camera className="h-3 w-3" /> Delivery Proof Media ({deliveryProofs.length})
      </span>
      <div className="grid grid-cols-4 gap-2">
        {deliveryProofs.map((proof, idx) => (
          <div key={proof.id || idx} className="relative aspect-square rounded-md overflow-hidden border cursor-pointer" onClick={() => window.open(proof.file_url, '_blank')}>
            {proof.file_url && proof.file_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
              <img src={proof.file_url} alt={`Delivery Proof ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <FileIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {deliveryProofs.map((proof, idx) => (
          <div key={idx}>Uploaded: {formatDateTime(proof.uploaded_at)}</div>
        ))}
      </div>
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
        {refundDetails?.customer_note && (
          <div>
            <span className="text-xs text-muted-foreground block">Additional Note:</span>
            <p className="text-sm mt-1 p-2 bg-white rounded border italic">{refundDetails.customer_note}</p>
          </div>
        )}
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

// ===== INVESTIGATION TIMELINE =====
function InvestigationTimeline({ refund }: { refund: any }) {
  const timelineEvents = [];
  
  if (refund.requested_at) {
    timelineEvents.push({ date: refund.requested_at, title: 'Refund Requested', description: `Reason: ${refund.reason || 'N/A'}`, icon: FileText });
  }
  if (refund.dispute_details?.created_at) {
    timelineEvents.push({ date: refund.dispute_details.created_at, title: 'Dispute Filed', description: refund.dispute_details.reason, icon: ShieldAlert });
  }
  if (refund.dispute_details?.status === 'under_review' && refund.dispute_details?.updated_at) {
    timelineEvents.push({ date: refund.dispute_details.updated_at, title: 'Under Review', description: 'Admin review started', icon: Scale });
  }
  if (refund.processed_at) {
    timelineEvents.push({ date: refund.processed_at, title: 'Refund Processed', description: `By: ${refund.processed_by?.username || 'Admin'}`, icon: CheckSquare });
  }
  if (refund.dispute_details?.resolved_at) {
    timelineEvents.push({ date: refund.dispute_details.resolved_at, title: 'Dispute Resolved', description: `Status: ${refund.dispute_details.status}`, icon: Gavel });
  }
  
  timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (timelineEvents.length === 0) return null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> Investigation Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
          {timelineEvents.map((event, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[23px] mt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
              </div>
              <div className="text-xs">
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground text-[10px]">{formatDateTime(event.date)}</p>
                {event.description && <p className="text-[11px] mt-0.5">{event.description}</p>}
              </div>
            </div>
          ))}
        </div>
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
            <span className="text-xs text-muted-foreground block">Liability / Case Category</span>
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
            {dispute.requested_by?.email && <p className="text-[10px] text-muted-foreground">{dispute.requested_by.email}</p>}
          </div>
          <div>
            <span className="text-muted-foreground">Filed At:</span>
            <p className="font-medium">{formatDateTime(dispute.created_at)}</p>
          </div>
          {dispute.processed_by && (
            <>
              <div>
                <span className="text-muted-foreground">Resolved By:</span>
                <p className="font-medium">{dispute.processed_by.username || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Resolved At:</span>
                <p className="font-medium">{formatDateTime(dispute.resolved_at)}</p>
              </div>
            </>
          )}
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

// ===== STATUS BANNER =====
function StatusBanner({ status, refund }: { status: keyof typeof statusConfig, refund: RefundFlat & { [key: string]: any } }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const activeDispute = getActiveDispute(refund);
  const disputeStatus = activeDispute?.status || '';

  return (
    <div className={`${config.color} border rounded-md p-3`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground mx-1">•</span>
        <span className="text-xs">{config.description}</span>
      </div>

      {status === 'pending' && refund.requested_at && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-yellow-200 pt-2">
          Requested: {new Date(refund.requested_at).toLocaleDateString()}
        </div>
      )}
      
      {(status === 'dispute' || status === 'under_review') && (
        <>
          {refund.dispute_reason && (
            <div className="mt-2 text-xs text-muted-foreground border-t border-orange-200 pt-2">
              <strong>Dispute Reason:</strong> {refund.dispute_reason}
            </div>
          )}
          {activeDispute?.created_at && (
            <div className="mt-1 text-xs text-muted-foreground">
              Filed: {new Date(activeDispute.created_at).toLocaleDateString()}
            </div>
          )}
          {disputeStatus === 'under_review' && (
            <div className="mt-2 text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-700">
              <strong>Status:</strong> Under Review - Admin is currently reviewing this dispute.
            </div>
          )}
          {disputeStatus === 'filed' && (
            <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-700">
              <strong>Status:</strong> Dispute Filed - Waiting for admin review.
            </div>
          )}
        </>
      )}
      
      {status === 'waiting' && refund.return_request?.tracking_number && (
        <div className="mt-2 text-xs text-muted-foreground border-t border-indigo-200 pt-2">
          Tracking: {refund.return_request.tracking_number}
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

// ===== PROCESSING UI =====
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
  setRefund: (value: any | ((prev: any) => any)) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProofs, setUploadingProofs] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const getPaymentDetail = () => refund.payment_details;

  const renderSelectedPaymentDetails = () => {
    const pd = getPaymentDetail();
    if (!pd) return null;

    return (
      <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100 space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px]">Payment Method</span>
            <p className="font-medium capitalize">{pd.payment_method || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Account Name</span>
            <p className="font-medium">{pd.account_name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-[10px]">Account Number</span>
            <p className="font-medium">{pd.masked_account_number || pd.account_number || 'N/A'}</p>
          </div>
          {pd.bank_name && (
            <div>
              <span className="text-muted-foreground text-[10px]">Bank Name</span>
              <p className="font-medium">{pd.bank_name}</p>
            </div>
          )}
          {pd.is_default !== undefined && (
            <div>
              <span className="text-muted-foreground text-[10px]">Default</span>
              <p className="font-medium">{pd.is_default ? 'Yes' : 'No'}</p>
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
      if (!f.type.startsWith('image/')) { toast({ title: 'Invalid file', description: `${f.name} is not an image`, variant: 'destructive' }); return false; }
      if (f.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: `${f.name} exceeds 5MB`, variant: 'destructive' }); return false; }
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
    if (!id) { toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' }); return; }
    if (!hasProofs()) { toast({ title: 'Proof Required', description: 'Please upload proof of refund before completing', variant: 'destructive' }); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedProofFiles.forEach(f => formData.append('file_data', f));
      if (proofNotes) formData.append('notes', proofNotes);
      formData.append('set_status', 'completed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      const response = await AxiosInstance.post(`/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`, formData, {
        headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        toast({ title: 'Success', description: 'Refund marked as completed' });
        setSelectedProofFiles([]); setProofPreviews([]); setProofNotes(''); setAdminNotes('');
        onComplete();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to complete refund', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  const handleMarkAsFailed = async () => {
    const id = refund?.refund_id;
    if (!id) { toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' }); return; }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('set_status', 'failed');
      if (adminNotes) formData.append('customer_note', adminNotes);

      const response = await AxiosInstance.post(`/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`, formData, {
        headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        toast({ title: 'Success', description: 'Refund marked as failed' });
        setRefund((prev: any) => ({ ...prev, refund_details: { ...prev.refund_details, refund_payment_status: 'failed' } }));
        onCancel();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message || 'Failed to mark as failed', variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  const refundMethod = refund.refund_details?.final_refund_method || refund.refund_details?.buyer_preferred_refund_method || 'Not specified';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
            <Wallet className="h-4 w-4" /> Refund Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Approved Amount</span>
              <p className="text-lg font-semibold text-green-600">{formatMoney(refund.refund_details?.approved_refund_amount || refund.refund_details?.total_refund_amount)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Refund Method</span>
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{refundMethod}</span>
              </div>
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
          {refund.payment_details ? (
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
            <Input type="file" accept="image/*" multiple onChange={handleProofFileSelect} className="text-xs h-8" disabled={uploadingProofs || isSubmitting} />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" /> Admin Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add notes about the refund processing..." className="w-full border rounded-md p-2 text-xs min-h-[60px]" disabled={isSubmitting} />
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
export async function loader({ request, context, params }: any) {
  try {
    const { requireRole } = await import('~/middleware/role-require.server');
    await requireRole(request, undefined, ['isAdmin'] as any);
  } catch (err) {
    console.error('loader middleware error', err);
  }

  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const refundId = params?.refundId || url.searchParams.get('refund_id') || url.searchParams.get('refund');
  if (!refundId) throw new Response('refund id required', { status: 400 });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  try {
    const detailRes = await fetch(`${API_BASE_URL}/admin-refunds/${encodeURIComponent(String(refundId))}/full-details/`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-User-Id': String(userId) },
      credentials: 'include'
    });

    if (detailRes.ok) {
      const fullDetails = await detailRes.json();
      
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
      
      return { user: { id: userId, isAdmin: true }, refund: transformedRefund };
    }
  } catch (err) {
    console.error('Failed to fetch full details', err);
  }

  try {
    const detailRes = await fetch(`${API_BASE_URL}/admin-refunds/${encodeURIComponent(String(refundId))}/get_admin_refund_details/`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-User-Id': String(userId) },
      credentials: 'include'
    });

    if (detailRes.ok) {
      const details = await detailRes.json();
      return { user: { id: userId, isAdmin: true }, refund: details };
    }
  } catch (err) {
    console.error('Failed to fetch admin details', err);
  }

  const res = await fetch(`${API_BASE_URL}/admin-refunds/refund_list/`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-User-Id': String(userId) },
    credentials: 'include'
  });
  if (!res.ok) { const text = await res.text(); throw new Response(text || 'Failed to fetch refunds list', { status: res.status }); }

  const list = await res.json();
  const refunds = Array.isArray(list) ? list : Array.isArray(list.refunds) ? list.refunds : [];
  const found = refunds.find((r: RefundFlat) => String(r.refund_id) === String(refundId) || String(r.refund) === String(refundId) || String(r.id) === String(refundId));
  if (!found) throw new Response('Refund not found', { status: 404 });

  const normalizedRefund = { ...found, refund: found.refund_id || found.refund || found.id };
  return { user: { id: userId, isAdmin: true }, refund: normalizedRefund };
}

// ===== MAIN COMPONENT =====
export default function AdminViewRefundDetails() {
  const { refund: initialRefund, user } = useLoaderData<typeof loader>();
  const [refund, setRefund] = useState<RefundFlat & { [key: string]: any }>(initialRefund);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [refundType, setRefundType] = useState<'full' | 'partial' | ''>('');
  const [refundAmount, setRefundAmount] = useState<number>(Number(initialRefund.total_refund_amount ?? 0));
  const [selectedLiabilities, setSelectedLiabilities] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | '70_30' | '30_70' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'reject' | 'confirm' | null>(null);
  const [modalAuthChecked, setModalAuthChecked] = useState(false);

  const liabilityOptions = [
    { id: 'merchant_fulfillment_issue', label: 'Merchant Fulfillment Issue (Seller)' },
    { id: 'logistics_delivery_issue', label: 'Logistics / Delivery Issue (Delivery Partner)' },
    { id: 'customer_related_issue', label: 'Customer-Related Issue (Customer)' },
    { id: 'shared_responsibility', label: 'Shared Responsibility' },
    { id: 'platform_system_issue', label: 'Platform / System Issue' }
  ];

  useEffect(() => {
    if (selectedLiabilities.length > 1) {
      const eq = 100 / selectedLiabilities.length;
      const initial: Record<string, number> = {};
      selectedLiabilities.forEach(id => { initial[id] = Math.round(eq * 100) / 100; });
      setCustomSplits(initial);
    }
  }, [selectedLiabilities.length]);

  const handleLiabilityChange = (id: string) => {
    setSelectedLiabilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCustomSplitChange = (id: string, value: string) => {
    setCustomSplits(prev => ({ ...prev, [id]: value === '' ? 0 : Number(value) }));
  };

  const getCustomSplitTotal = () => Object.values(customSplits).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleProcessRefund = async () => {
    const id = refund?.refund_id;
    if (!id) {
      toast({ title: 'Error', description: 'Missing refund identifier', variant: 'destructive' });
      setProcessing(false);
      return;
    }

    setProcessing(true);
    try {
      const response = await AxiosInstance.post(
        `/admin-refunds/${encodeURIComponent(String(id))}/admin_process_refund/`,
        { set_status: 'processing' },
        { headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'application/json' } }
      );
      if (response.data.success) {
        toast({ title: 'Success', description: 'Refund payment status set to processing.' });
        setRefund(prev => ({ ...prev, refund_payment_status: 'processing', refund_details: { ...prev.refund_details, refund_payment_status: 'processing' } }));
        try {
          const refreshRes = await AxiosInstance.get(
            `/admin-refunds/${encodeURIComponent(String(id))}/full-details/`,
            { headers: { 'X-User-Id': String(user?.id || '') } }
          );
          if (refreshRes.data) {
            const fullDetails = refreshRes.data;
            setRefund(prev => ({
              ...prev,
              refund_id: fullDetails.refund_id,
              ...fullDetails.refund_details,
              order_details: fullDetails.order_details,
              product_details: fullDetails.product_details,
              delivery_details: fullDetails.delivery_details,
              proof_media: fullDetails.proof_media,
              refund_media: fullDetails.refund_media,
              payment_details: fullDetails.payment_details,
              dispute_details: fullDetails.dispute_details,
            }));
          }
        } catch { }
      } else {
        toast({ title: 'Error', description: response.data.error || 'Failed to set refund to processing', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || err.response?.data?.message || 'Failed to set refund to processing', variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const handleCompleteRefund = () => {
    setRefund(prev => ({ ...prev, status: 'completed', refund_payment_status: 'completed', processed_at: new Date().toISOString() }));
    toast({ title: 'Completed', description: 'Refund has been marked as completed.' });
  };

  const handleCancelProcessing = () => {
    setRefund(prev => ({ ...prev, refund_payment_status: 'pending' }));
    toast({ title: 'Cancelled', description: 'Refund processing has been cancelled.' });
  };

  const handleConfirmProcessRefund = async () => {
    if (!selectedLiabilities.length) { 
      toast({ title: 'Error', description: 'Please select at least one liability category.', variant: 'destructive' }); 
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
    if (selectedLiabilities.length > 1 && splitType === 'custom' && getCustomSplitTotal() !== 100) { 
      toast({ title: 'Error', description: 'Custom split must total 100%.', variant: 'destructive' }); 
      return; 
    }

    setIsSubmitting(true);
    try {
      const refundId = refund?.refund_id;
      if (!refundId) {
        toast({ title: 'Error', description: 'Cannot find refund ID', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      
      const disputesRes = await AxiosInstance.get('/disputes/', { 
        params: { refund_id: String(refundId) }, 
        headers: { 'X-User-Id': String(user?.id || '') } 
      });
      
      const disputes = Array.isArray(disputesRes?.data) ? disputesRes.data : 
                       Array.isArray(disputesRes?.data?.data) ? disputesRes.data.data : [];
      const activeDispute = disputes.find((d: any) => 
        String(d.refund) === String(refundId) || 
        String(d.refund_id) === String(refundId)
      );

      if (!activeDispute?.id) { 
        toast({ title: 'Error', description: 'No active dispute found for this refund.', variant: 'destructive' }); 
        setIsSubmitting(false); 
        return; 
      }

      let distribution: Record<string, number> = {};
      if (selectedLiabilities.length === 1) {
        distribution[selectedLiabilities[0]] = 100;
      } else if (splitType === 'equal') {
        const equalShare = 100 / selectedLiabilities.length;
        selectedLiabilities.forEach(id => { distribution[id] = equalShare; });
      } else if (splitType === '70_30' && selectedLiabilities.length === 2) {
        distribution[selectedLiabilities[0]] = 70;
        distribution[selectedLiabilities[1]] = 30;
      } else if (splitType === '30_70' && selectedLiabilities.length === 2) {
        distribution[selectedLiabilities[0]] = 30;
        distribution[selectedLiabilities[1]] = 70;
      } else if (splitType === 'custom') {
        distribution = customSplits;
      }

      const approveData = {
        refund_id: refundId,
        dispute_id: activeDispute.id,
        decision: 'approve',
        refund_type: refundType,
        refund_amount: refundAmount,
        liability_distribution: distribution,
        admin_notes: `Approved ${refundType} refund of ₱${refundAmount.toFixed(2)}. Liability: ${JSON.stringify(distribution)}`
      };

      const response = await AxiosInstance.post('/disputes/approve_refund/', approveData, {
        headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'application/json' }
      });

      if (response.data) {
        toast({ title: 'Success', description: `Refund ${refundType === 'full' ? 'fully' : 'partially'} approved.` });
        setRefund(prev => ({ 
          ...prev, 
          status: 'approved',
          refund_details: { ...prev.refund_details, status: 'approved', approved_refund_amount: refundAmount }
        }));
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to approve refund', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayStatus = () => {
    const s = String(refund.status || refund.refund_details?.status || '').toLowerCase();
    const disputeStatus = String(refund.dispute_details?.status || refund.dispute_request?.status || '').toLowerCase();
    if (['under_review', 'investigating', 'in_review'].includes(disputeStatus) && s === 'dispute') return 'under_review';
    return s;
  };

  const st = getDisplayStatus();
  const getPaymentStatusLower = () => String(refund.refund_payment_status || refund.refund_details?.refund_payment_status || '').toLowerCase();
  const isProcessing = getPaymentStatusLower() === 'processing' && String(refund.status || '').toLowerCase() === 'approved';
  const activeDispute = getActiveDispute(refund);
  const effectiveSt = (getPaymentStatusLower() === 'completed' && st === 'approved') ? 'completed' : st;
  
  const shippingAddress = refund.default_shipping_address || refund.order_details?.shipping_address;
  const orderDeliveries = refund.delivery_details || [];
  const proofMedia = refund.proof_media || [];
  const refundMedia = refund.refund_media || [];
  const productItems = refund.product_details || refund.products || [];
  const orderInfo = refund.order_details || refund.order;

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {String(searchParams.get('debug')) === '1' && (
        <Card className="mb-4 border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700"><Info className="h-4 w-4" />Debug: Raw Refund Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96 bg-gray-100 p-2 rounded">{JSON.stringify(refund, null, 2)}</pre>
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
                <Eye className="w-4 h-4" />
                Refund {refund?.refund_id ? String(refund.refund_id).slice(0, 8) : 'N/A'}
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
          {isProcessing ? (
            <ProcessingUI refund={refund} onComplete={handleCompleteRefund} onCancel={handleCancelProcessing} user={user} setRefund={setRefund} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ===== LEFT: Main Investigation Details ===== */}
              <div className="lg:col-span-2 space-y-4">

                <StatusBanner status={effectiveSt as keyof typeof statusConfig} refund={refund} />

                {/* ===== BUYER REQUEST (TOP - MOST IMPORTANT) ===== */}
                <BuyerRequestCard refundMedia={refundMedia} refundDetails={refundDetails} />

                {/* ===== SELLER RESPONSE (TOP - MOST IMPORTANT) ===== */}
                <SellerResponseCard refundMedia={refundMedia} refundDetails={refundDetails} />

                {/* Investigation Timeline */}
                <InvestigationTimeline refund={refund} />

                {activeDispute && <DisputeDetailsCard dispute={activeDispute} />}

                {/* ===== 1. REFUND DETAILS ===== */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Refund Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground block">Refund ID</span>
                        <p className="font-medium font-mono text-xs">{refund.refund_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Order ID</span>
                        <p className="font-medium">{orderInfo?.order || refund.order_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Reason</span>
                        <p className="font-medium">{refund.reason || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Refund Type</span>
                        <p className="font-medium capitalize">{refund.refund_type || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Order Total</span>
                        <p className="font-medium">{formatMoney(orderInfo?.total_amount || refund.order_total_amount)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Requested Refund</span>
                        <p className="font-medium text-blue-600">{formatMoney(refund.total_refund_amount)}</p>
                      </div>
                      {refund.approved_refund_amount && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Approved Amount</span>
                          <p className="font-medium text-green-600">{formatMoney(refund.approved_refund_amount)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground block">Preferred Method</span>
                        <p className="font-medium capitalize">{refund.preferred_refund_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Final Method</span>
                        <p className="font-medium capitalize">{refund.final_refund_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Payment Status</span>
                        <p className="font-medium capitalize">{refund.refund_payment_status || 'N/A'}</p>
                      </div>
                      {refund.refund_fee && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Refund Fee</span>
                          <p className="font-medium">{formatMoney(refund.refund_fee)}</p>
                        </div>
                      )}
                    </div>
                    {refund.detailed_reason && (
                      <div className="border-t pt-2">
                        <span className="text-xs text-muted-foreground block">Detailed Reason</span>
                        <p className="text-sm mt-1">{refund.detailed_reason}</p>
                      </div>
                    )}
                    {refund.customer_note && (
                      <div className="border-t pt-2">
                        <span className="text-xs text-muted-foreground block">Customer Note</span>
                        <p className="text-sm mt-1 italic">{refund.customer_note}</p>
                      </div>
                    )}
                    {refund.reject_reason_code && (
                      <div className="border-t pt-2">
                        <span className="text-xs text-muted-foreground block">Rejection Code</span>
                        <p className="text-sm mt-1">{refund.reject_reason_code}: {refund.reject_reason_details}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ===== 2. CUSTOMER INFO ===== */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" /> Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Username</span>
                      <p className="font-medium">{orderInfo?.user?.username || refund.requested_by_username || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Email</span>
                      <p className="font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {orderInfo?.user?.email || refund.requested_by_email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Contact Number</span>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {orderInfo?.user?.contact_number || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">User ID</span>
                      <p className="font-mono text-xs">{orderInfo?.user?.id || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block">Registered Address</span>
                      <p className="font-medium text-xs">
                        {orderInfo?.user?.street && orderInfo?.user?.city 
                          ? `${orderInfo.user.street}, ${orderInfo.user.barangay || ''}, ${orderInfo.user.city}, ${orderInfo.user.province || ''}, ${orderInfo.user.zip_code || ''}`
                          : 'N/A'}
                      </p>
                    </div>
                    {orderInfo?.user?.created_at && (
                      <div className="col-span-2 border-t pt-2 mt-1">
                        <span className="text-xs text-muted-foreground block">Customer Since</span>
                        <p className="text-xs">{formatDateTime(orderInfo.user.created_at)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ===== 3. SHIPPING ADDRESS ===== */}
                {shippingAddress && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Shipping Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground block">Recipient</span>
                          <p className="font-medium">{shippingAddress.recipient_name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Phone</span>
                          <p className="font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {shippingAddress.recipient_phone || 'N/A'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-muted-foreground block">Full Address</span>
                          <p className="text-sm">{shippingAddress.full_address || 
                            `${shippingAddress.street || ''} ${shippingAddress.barangay || ''} ${shippingAddress.city || ''} ${shippingAddress.province || ''} ${shippingAddress.zip_code || ''}`.trim() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ===== 4. PRODUCT DETAILS ===== */}
                {productItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" /> Product Details ({productItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {productItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3 border-b pb-3 last:border-0">
                          {item.image && (
                            <div className="w-16 h-16 rounded overflow-hidden border bg-gray-50 flex-shrink-0">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.variant_name && <p className="text-xs text-muted-foreground">Variant: {item.variant_name}</p>}
                            {item.variant_sku && <p className="text-xs font-mono text-muted-foreground">SKU: {item.variant_sku}</p>}
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Qty:</span> {item.quantity}</div>
                              <div><span className="text-muted-foreground">Unit Price:</span> {formatMoney(item.price)}</div>
                              <div><span className="text-muted-foreground">Total:</span> {formatMoney(item.item_total_amount || item.total_amount)}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {item.condition && (
                                <div><span className="text-muted-foreground">Condition:</span> {item.condition}/5</div>
                              )}
                              {item.is_refundable !== undefined && (
                                <div><span className="text-muted-foreground">Refundable:</span> {item.is_refundable ? 'Yes' : 'No'}</div>
                              )}
                              {item.refund_days > 0 && (
                                <div><span className="text-muted-foreground">Refund Period:</span> {item.refund_days} days</div>
                              )}
                              {item.compare_price && (
                                <div><span className="text-muted-foreground">Compare Price:</span> {formatMoney(item.compare_price)}</div>
                              )}
                              {item.original_price && (
                                <div><span className="text-muted-foreground">Original Price:</span> {formatMoney(item.original_price)}</div>
                              )}
                              {item.purchase_date && (
                                <div><span className="text-muted-foreground">Purchase Date:</span> {formatDateTime(item.purchase_date)}</div>
                              )}
                              {item.usage_period && (
                                <div><span className="text-muted-foreground">Usage Period:</span> {item.usage_period} {item.usage_unit}</div>
                              )}
                            </div>
                            
                            {item.description && (
                              <div className="text-xs mt-1">
                                <span className="text-muted-foreground">Description:</span> {item.description}
                              </div>
                            )}
                            
                            {item.shop && (
                              <div className="flex items-center gap-2 text-xs pt-1 border-t mt-1">
                                <Store className="h-3 w-3" />
                                <span>{item.shop.name}</span>
                                {item.shop.verified && <Badge variant="outline" className="text-[8px]">Verified</Badge>}
                              </div>
                            )}
                            
                            {item.proof_image && (
                              <div className="mt-1">
                                <span className="text-xs text-muted-foreground">Proof Image:</span>
                                <a href={item.proof_image} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs ml-2">
                                  <ExternalLink className="h-3 w-3 inline" /> View
                                </a>
                              </div>
                            )}
                            
                            {item.product_images && item.product_images.length > 0 && (
                              <div className="mt-1">
                                <MediaGallery files={item.product_images.map((url: string, i: number) => ({ id: i, file_url: url }))} title="Product Images" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ===== 5. DELIVERY INFORMATION (WITH MEDIA) ===== */}
                {orderDeliveries.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Delivery Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {orderDeliveries.map((delivery: any, idx: number) => (
                        <div key={idx} className={idx > 0 ? "border-t pt-3" : ""}>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-xs text-muted-foreground block">Delivery ID</span>
                              <p className="font-mono text-xs">{delivery.id || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Status</span>
                              <p className="font-medium capitalize">{delivery.status || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Delivery Rating</span>
                              <p className="font-medium">{delivery.delivery_rating ? `${delivery.delivery_rating}/5` : 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Distance</span>
                              <p className="font-medium">{delivery.distance_km ? `${delivery.distance_km} km` : 'N/A'}</p>
                            </div>
                            {delivery.delivery_fee && (
                              <div>
                                <span className="text-xs text-muted-foreground block">Delivery Fee</span>
                                <p className="font-medium">{formatMoney(delivery.delivery_fee)}</p>
                              </div>
                            )}
                          </div>
                          
                          {delivery.rider && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-xs font-medium flex items-center gap-1 mb-2"><Bike className="h-3 w-3" /> Rider Details</span>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Name</span>
                                  <p className="font-medium">{delivery.rider.username || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Contact</span>
                                  <p className="font-medium flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {delivery.rider.contact_number || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rider ID</span>
                                  <p className="font-mono text-xs">{delivery.rider.id || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-xs font-medium mb-2 block">Timeline</span>
                            <div className="space-y-1 text-xs">
                              {delivery.picked_at && (
                                <div className="flex justify-between">
                                  <span>Picked Up:</span>
                                  <span className="font-medium">{formatDateTime(delivery.picked_at)}</span>
                                </div>
                              )}
                              {delivery.delivered_at && (
                                <div className="flex justify-between">
                                  <span>Delivered:</span>
                                  <span className="font-medium">{formatDateTime(delivery.delivered_at)}</span>
                                </div>
                              )}
                              {delivery.scheduled_pickup_time && (
                                <div className="flex justify-between">
                                  <span>Scheduled Pickup:</span>
                                  <span className="font-medium">{formatDateTime(delivery.scheduled_pickup_time)}</span>
                                </div>
                              )}
                              {delivery.scheduled_delivery_time && (
                                <div className="flex justify-between">
                                  <span>Scheduled Delivery:</span>
                                  <span className="font-medium">{formatDateTime(delivery.scheduled_delivery_time)}</span>
                                </div>
                              )}
                              {delivery.created_at && (
                                <div className="flex justify-between">
                                  <span>Delivery Created:</span>
                                  <span className="font-medium">{formatDateTime(delivery.created_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {delivery.notes && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-xs text-muted-foreground block">Delivery Notes</span>
                              <p className="text-xs mt-1 italic">{delivery.notes}</p>
                            </div>
                          )}
                          
                          {/* Delivery Media/Proofs */}
                          {delivery.proofs && delivery.proofs.length > 0 && (
                            <DeliveryMediaCard proofs={delivery.proofs} />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ===== 6. PROOF OF DELIVERY MEDIA (Legacy - kept for backward compatibility) ===== */}
                {proofMedia.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Camera className="h-4 w-4" /> All Delivery Proofs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MediaGallery files={proofMedia} title="Delivery Proofs" />
                    </CardContent>
                  </Card>
                )}

                {/* ===== 7. OTHER REFUND MEDIA (Admin/System) ===== */}
                {refundMedia.filter((m: any) => !m.is_proof && m.uploaded_by_entity !== 'buyer' && m.uploaded_by_entity !== 'seller').length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Other Refund Media
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MediaGallery files={refundMedia.filter((m: any) => !m.is_proof && m.uploaded_by_entity !== 'buyer' && m.uploaded_by_entity !== 'seller')} title="Other Media" />
                    </CardContent>
                  </Card>
                )}

                {/* ===== 8. PAYMENT DETAILS ===== */}
                {refund.payment_details && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50/50 rounded-md p-3 border border-blue-100 space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground text-[10px]">Payment ID</span>
                            <p className="font-mono text-xs">{refund.payment_details.id || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px]">Payment Method</span>
                            <p className="font-medium capitalize">{refund.payment_details.payment_method || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px]">Account Name</span>
                            <p className="font-medium">{refund.payment_details.account_name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px]">Account Number</span>
                            <p className="font-mono">{refund.payment_details.masked_account_number || refund.payment_details.account_number || 'N/A'}</p>
                          </div>
                          {refund.payment_details.bank_name && (
                            <div>
                              <span className="text-muted-foreground text-[10px]">Bank Name</span>
                              <p className="font-medium">{refund.payment_details.bank_name}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground text-[10px]">Default</span>
                            <p className="font-medium">{refund.payment_details.is_default ? 'Yes' : 'No'}</p>
                          </div>
                          {refund.payment_details.verified_by && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground text-[10px]">Verified By</span>
                              <p className="font-medium">{refund.payment_details.verified_by.username}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ===== 9. ORDER SUMMARY ===== */}
                {orderInfo && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Order ID</span>
                        <p className="font-mono text-xs">{orderInfo.order || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Order Status</span>
                        <p className="font-medium capitalize">{orderInfo.status || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Payment Method</span>
                        <p className="font-medium">{orderInfo.payment_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Delivery Method</span>
                        <p className="font-medium">{orderInfo.delivery_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Created At</span>
                        <p className="text-xs">{formatDateTime(orderInfo.created_at)}</p>
                      </div>
                      {orderInfo.completed_at && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Completed At</span>
                          <p className="text-xs">{formatDateTime(orderInfo.completed_at)}</p>
                        </div>
                      )}
                      {orderInfo.approval_status && (
                        <div>
                          <span className="text-xs text-muted-foreground block">Approval Status</span>
                          <p className="font-medium capitalize">{orderInfo.approval_status}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ===== RIGHT: Admin Actions Sidebar ===== */}
              <aside className="space-y-3">
                <Card id="admin-actions" className="border shadow-none">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Admin Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">

                    {effectiveSt !== 'completed' && effectiveSt !== 'under_review' && effectiveSt !== 'rejected' && effectiveSt !== 'cancelled' && (
                      <Button
                        size="sm"
                        className="w-full text-xs h-8"
                        disabled={processing}
                        onClick={async () => {
                          if (effectiveSt === 'negotiation') { setShowConfirmModal(true); return; }

                          if (effectiveSt === 'dispute') {
                            try {
                              setProcessing(true);
                              const refundId = refund?.refund_id;
                              
                              if (!refundId) {
                                toast({ title: 'Error', description: 'Cannot find refund ID', variant: 'destructive' });
                                setProcessing(false);
                                return;
                              }
                              
                              const listRes = await AxiosInstance.get('/disputes/', { 
                                params: { refund_id: String(refundId) }, 
                                headers: { 'X-User-Id': String(user?.id || '') } 
                              });
                              
                              const disputes = Array.isArray(listRes?.data) ? listRes.data : 
                                               Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
                              const first = disputes[0];
                              
                              if (!first?.id) { 
                                toast({ title: 'No dispute found', description: 'Cannot start review without an existing dispute.', variant: 'destructive' });
                                return;
                              }
                              
                              const response = await AxiosInstance.post(`/disputes/${first.id}/start_review/`, null, { 
                                headers: { 'X-User-Id': String(user?.id || ''), 'Content-Type': 'application/json' } 
                              });
                              
                              if (response.data) {
                                toast({ title: 'Review started', description: 'Dispute marked under review.' });
                                setRefund(prev => ({ ...prev, status: 'under_review', dispute_details: { ...prev.dispute_details, status: 'under_review' } }));
                              }
                            } catch (err: any) {
                              toast({ title: 'Failed to start review', description: err.response?.data?.error || err.message || 'Unknown error occurred', variant: 'destructive' });
                            } finally { setProcessing(false); }
                            return;
                          }

                          if (effectiveSt === 'approved') {
                            await handleProcessRefund();
                            return;
                          }
                        }}
                      >
                        {effectiveSt === 'dispute' ? (
                          <><ShieldAlert className="w-3 h-3 mr-1" /> Start Review</>
                        ) : effectiveSt === 'approved' ? (
                          <><RefreshCw className="w-3 h-3 mr-1" /> Process Refund</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Proceed</>
                        )}
                      </Button>
                    )}

                    {effectiveSt === 'under_review' && (
                      <>
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Refund Decision</p>
                          <div className="space-y-1">
                            {(['full', 'partial'] as const).map(type => (
                              <div key={type} className="flex items-center space-x-2">
                                <input type="radio" id={`${type}_refund`} name="refund_type" value={type} checked={refundType === type}
                                  onChange={e => { setRefundType(e.target.value as 'full' | 'partial'); if (e.target.value === 'full') setRefundAmount(Number(refund.total_refund_amount) || 0); }}
                                  className="h-3 w-3" />
                                <Label htmlFor={`${type}_refund`} className="text-xs cursor-pointer capitalize">{type} Refund</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {refundType && (
                          <div className="space-y-1 mb-3">
                            <Label htmlFor="refund_amount" className="text-xs">Amount {refundType === 'full' && '(Full)'}</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span>
                              <Input id="refund_amount" type="number" step="0.01" min="0" max={refund.total_refund_amount || 0}
                                value={refundAmount} onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                                disabled={refundType === 'full'} className="pl-6 text-xs h-7" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium">Liability / Case Category</p>
                          <div className="space-y-1">
                            {liabilityOptions.map(option => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox id={option.id} checked={selectedLiabilities.includes(option.id)} onCheckedChange={() => handleLiabilityChange(option.id)} className="h-3 w-3" />
                                <Label htmlFor={option.id} className="text-xs cursor-pointer">{option.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedLiabilities.length > 1 && (
                          <div className="border-t pt-2 mt-1 mb-3">
                            <p className="text-xs font-medium mb-2 flex items-center gap-1"><Scale className="h-3 w-3" />Split Options</p>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {['equal', ...(selectedLiabilities.length === 2 ? ['70_30', '30_70'] : []), 'custom'].map(type => (
                                  <label key={type} className="flex items-center gap-1 text-xs">
                                    <input type="radio" name="splitType" checked={splitType === type} onChange={() => setSplitType(type as any)} className="h-3 w-3" />
                                    {type === 'equal' ? 'Equal' : type === '70_30' ? '70/30' : type === '30_70' ? '30/70' : 'Custom'}
                                  </label>
                                ))}
                              </div>

                              {splitType === 'custom' && (
                                <div className="space-y-1 mt-1">
                                  {selectedLiabilities.map(id => {
                                    const opt = liabilityOptions.find(o => o.id === id);
                                    return (
                                      <div key={id} className="flex items-center gap-2 text-xs">
                                        <span className="w-20 truncate">{opt?.label.split('(')[0].trim()}</span>
                                        <div className="relative w-16">
                                          <Input type="number" min="0" max="100" step="1" value={customSplits[id] || 0}
                                            onChange={e => handleCustomSplitChange(id, e.target.value)} className="text-xs h-6 pr-5" />
                                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {getCustomSplitTotal() !== 100 && <p className="text-[9px] text-red-500">Total: {getCustomSplitTotal()}% (must be 100%)</p>}
                                </div>
                              )}

                              {splitType !== 'custom' && selectedLiabilities.length > 0 && (
                                <div className="bg-purple-50 rounded p-1.5 text-[10px] mt-1">
                                  <p className="font-medium text-purple-700 mb-0.5">Preview:</p>
                                  {selectedLiabilities.map((id, idx) => {
                                    const opt = liabilityOptions.find(o => o.id === id);
                                    let pct = splitType === 'equal' ? 100 / selectedLiabilities.length : (splitType.split('_').map(Number))[idx] || 0;
                                    return (
                                      <div key={id} className="flex justify-between">
                                        <span>{opt?.label.split('(')[0].trim()}:</span>
                                        <span>{pct.toFixed(1)}% (₱{((refundAmount * pct) / 100).toFixed(2)})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedLiabilities.length === 1 && (
                          <div className="bg-green-50 border border-green-200 rounded p-1.5 mb-3">
                            <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /><span className="text-[10px] font-medium text-green-700">100% Liability</span></div>
                            <p className="text-[9px] text-green-600">{liabilityOptions.find(o => o.id === selectedLiabilities[0])?.label}</p>
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          <Button size="sm" variant="destructive" className="w-full text-xs h-7"
                            disabled={!selectedLiabilities.length || !refundType}
                            onClick={() => { setAuthAction('reject'); setModalAuthChecked(false); setShowAuthModal(true); }}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                          <Button size="sm" className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700"
                            disabled={!selectedLiabilities.length || !refundType || isSubmitting}
                            onClick={() => {
                              if (!selectedLiabilities.length) { toast({ title: 'Error', description: 'Select liability', variant: 'destructive' }); return; }
                              if (!refundType) { toast({ title: 'Error', description: 'Select refund type', variant: 'destructive' }); return; }
                              if (refundType === 'partial' && (!refundAmount || refundAmount <= 0)) { toast({ title: 'Error', description: 'Enter valid amount', variant: 'destructive' }); return; }
                              if (selectedLiabilities.length > 1 && splitType === 'custom' && getCustomSplitTotal() !== 100) { toast({ title: 'Error', description: 'Split must total 100%', variant: 'destructive' }); return; }
                              setAuthAction('confirm'); setModalAuthChecked(false); setShowAuthModal(true);
                            }}>
                            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve Refund'}
                          </Button>
                        </div>
                      </>
                    )}

                    {refund.processed_by?.username && (
                      <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                        Processed by: {refund.processed_by.username}
                        {refund.processed_at && ` • ${formatDateTime(refund.processed_at)}`}
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
                        try {
                          if (authAction === 'reject') {
                            setProcessing(true);
                            const listRes = await AxiosInstance.get('/disputes/', { params: { refund_id: String(refund.refund_id) }, headers: { 'X-User-Id': String(user?.id || '') } });
                            const disputes = Array.isArray(listRes?.data) ? listRes.data : Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
                            const active = disputes.find((d: any) => String(d.refund) === String(refund.refund_id) || String(d.refund_id) === String(refund.refund_id));
                            if (!active?.id) { toast({ title: 'No dispute found', variant: 'destructive' }); return; }
                            await AxiosInstance.post(`/disputes/${active.id}/reject/`, { admin_notes: 'Rejected by admin' }, { headers: { 'X-User-Id': String(user?.id || '') } });
                            toast({ title: 'Rejected', description: 'Dispute has been rejected.' });
                            setRefund(prev => ({ ...prev, status: 'rejected' }));
                          } else if (authAction === 'confirm') {
                            await handleConfirmProcessRefund();
                          }
                        } catch (err: any) {
                          toast({ title: 'Error', description: err.response?.data?.error || 'Action failed', variant: 'destructive' });
                        } finally {
                          setProcessing(false); setIsSubmitting(false); setAuthAction(null); setModalAuthChecked(false);
                        }
                      }}>Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </aside>
            </div>
          )}
        </CardContent>
      </Card>

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