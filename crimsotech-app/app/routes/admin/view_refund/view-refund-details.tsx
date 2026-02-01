"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { useToast } from '~/hooks/use-toast';
import AxiosInstance from '~/components/axios/Axios';
import { 
  ArrowLeft, CheckCircle, XCircle, Eye, AlertTriangle, Package, 
  PackageCheck, Truck, Clock, MessageCircle, User, Wallet, 
  Calendar, RefreshCw, CheckSquare, ShieldAlert, Ban, 
  FileText, ShoppingBag, CreditCard, DollarSign, Shield
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

// ===== Status UI Components =====

function AdminPendingStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const offers = refund.negotiation_offers || [];
  const hasOffers = offers.length > 0;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">Pending Seller Review</p>
              <p className="text-sm text-yellow-700 mt-1">
                Seller needs to review this refund request and decide to approve, reject, or negotiate.
              </p>
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Awaiting Action
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-yellow-100">
              <p className="text-xs font-medium text-yellow-800 mb-1">Time Elapsed</p>
              <p className="text-sm">
                Requested {refund.requested_at ? new Date(refund.requested_at).toLocaleDateString() : 'recently'}
              </p>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-yellow-100">
              <p className="text-xs font-medium text-yellow-800 mb-1">Action Required</p>
              <p className="text-sm">Seller response needed</p>
            </div>
          </div>

          {hasOffers && (
            <div className="mt-3 p-3 bg-yellow-100/50 rounded border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-1">Negotiation History</p>
              <p className="text-xs text-yellow-700">
                {offers.length} previous offer{offers.length !== 1 ? 's' : ''} made
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminNegotiationStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const offers = refund.negotiation_offers || [];
  const latestOffer = offers.length > 0 ? offers[offers.length - 1] : null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">Active Negotiation</p>
              <p className="text-sm text-blue-700 mt-1">
                Seller and buyer are negotiating refund terms. Admin can monitor or intervene if needed.
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              Negotiating
            </Badge>
          </div>

          {latestOffer && (
            <div className="mt-3 p-3 bg-white/50 rounded border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-800">Latest Offer</p>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {latestOffer.status || 'Pending'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-600">Amount</p>
                  <p className="font-medium">₱{Number(latestOffer.amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="font-medium">{latestOffer.refund_type || 'Partial'}</p>
                </div>
                {latestOffer.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-sm text-gray-700">{latestOffer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center text-sm text-blue-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>Admin can override negotiation by proceeding directly to processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminApprovedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const isReturn = String((refund.final_refund_type || '').toLowerCase()) === 'return' || String((refund.refund_type || '').toLowerCase()) === 'return' || String((refund.refund_category || '').toLowerCase()) === 'return_item';
  const rrStatus = String(rr?.status || '').toLowerCase();
  const payStatus = String(refund.refund_payment_status || '').toLowerCase();
  const finalType = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
  const isReturnAcceptedWaitingModeration = isReturn && rrStatus === 'approved' && String(refund.status || '').toLowerCase() === 'approved' && payStatus === 'pending' && finalType === 'return';
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Refund Approved</p>
              <p className="text-sm text-green-700 mt-1">
                {isReturn ? (
                  isReturnAcceptedWaitingModeration ? 'Seller accepted the return item. Proceed to refund now.' : 'Return request approved. Waiting for customer to ship the item back.'
                ) : 'Refund approved. Proceed to process the refund'}
              </p>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Approved
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-green-100">
              <p className="text-xs font-medium text-green-800 mb-1">Refund Method</p>
              <p className="text-sm font-medium flex items-center gap-2">
                {refund.final_refund_method === 'wallet' && <Wallet className="h-4 w-4" />}
                {refund.final_refund_method === 'card' && <CreditCard className="h-4 w-4" />}
                {refund.final_refund_method === 'bank' && <DollarSign className="h-4 w-4" />}
                {refund.final_refund_method || refund.preferred_refund_method || 'Not specified'}
              </p>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-green-100">
              <p className="text-xs font-medium text-green-800 mb-1">Amount</p>
              <p className="text-sm font-medium">₱{Number(refund.total_refund_amount || 0).toLocaleString()}</p>
              {refund.total_refund_amount != null && (
                <p className="text-xs text-gray-500 mt-1">(using <span className="font-medium">total_refund_amount</span>)</p>
              )}
            </div>
          </div>

          {isReturn && !rr?.tracking_number && (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="flex items-center">
                <Package className="h-4 w-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Waiting for return shipment.</span> Customer has been notified to ship the item back.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminWaitingStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const tracking = rr?.tracking_number || refund.tracking_number || null;
  const notified = Boolean(refund.buyer_notified_at);
  const shippedAt = rr?.shipped_at || null;
  
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Package className="h-5 w-5 text-indigo-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-indigo-800">Waiting for Return Shipment</p>
              <p className="text-sm text-indigo-700 mt-1">
                {tracking 
                  ? `Item is being shipped back. Tracking provided.` 
                  : (notified 
                    ? 'Customer has been notified to ship the item. Awaiting shipment.' 
                    : 'Customer will ship the return item')}
              </p>
            </div>
            <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
              Waiting
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {tracking && (
              <div className="bg-white/50 p-3 rounded border border-indigo-100">
                <p className="text-xs font-medium text-indigo-800 mb-1">Tracking Number</p>
                <p className="text-sm font-medium">{tracking}</p>
                <p className="text-xs text-gray-600 mt-1">{rr?.logistic_service || 'Not specified'}</p>
              </div>
            )}
            
            {shippedAt && (
              <div className="bg-white/50 p-3 rounded border border-indigo-100">
                <p className="text-xs font-medium text-indigo-800 mb-1">Shipped Date</p>
                <p className="text-sm">{new Date(shippedAt).toLocaleDateString()}</p>
              </div>
            )}
            
            {!tracking && (
              <div className="col-span-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-700">
                    No tracking number provided yet. Customer should provide tracking once shipped.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminShippedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const medias = rr?.medias || rr?.media || [];
  const estimatedDelivery = rr?.estimated_delivery || null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">Return In Transit</p>
              <p className="text-sm text-blue-700 mt-1">
                Item has been shipped back to seller. Waiting for delivery.
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              In Transit
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {rr?.tracking_number && (
              <div className="bg-white/50 p-3 rounded border border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1">Tracking Details</p>
                <p className="text-sm font-medium">{rr.tracking_number}</p>
                <p className="text-xs text-gray-600 mt-1">{rr.logistic_service || 'Not specified'}</p>
                {rr.tracking_url && (
                  <a 
                    href={rr.tracking_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Track Package →
                  </a>
                )}
              </div>
            )}

            {rr?.shipped_at && (
              <div className="bg-white/50 p-3 rounded border border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1">Shipping Timeline</p>
                <p className="text-sm">Shipped: {new Date(rr.shipped_at).toLocaleDateString()}</p>
                {estimatedDelivery && (
                  <p className="text-sm">Est. Delivery: {new Date(estimatedDelivery).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>

          {rr?.notes && (
            <div className="mt-3 p-3 bg-white/50 rounded border border-blue-100">
              <p className="text-xs font-medium text-blue-800 mb-1">Customer Notes</p>
              <p className="text-sm text-gray-700">{rr.notes}</p>
            </div>
          )}

          {medias && medias.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-blue-800 mb-2">Packaging Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {medias.map((m: any, idx: number) => (
                  <a 
                    key={m.id || idx} 
                    href={m.file_url || m.file_data || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="block rounded overflow-hidden bg-gray-100 border hover:opacity-90 transition-opacity"
                  >
                    {m.file_type && m.file_type.startsWith('image/') ? (
                      <img 
                        src={m.file_url || m.file_data} 
                        alt={`Return media ${idx + 1}`} 
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center text-gray-500 p-2">
                        <FileText className="h-8 w-8 mb-1" />
                        <span className="text-xs truncate w-full text-center">
                          {m.file_name?.split('.')[0] || 'Document'}
                        </span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminReceivedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const receivedAt = rr?.received_at || null;
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Package className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-800">Item Received by Seller</p>
              <p className="text-sm text-green-700 mt-1">
                Seller has received the returned item. Seller will inspect the item.
              </p>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Received
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {receivedAt && (
              <div className="bg-white/50 p-3 rounded border border-green-100">
                <p className="text-xs font-medium text-green-800 mb-1">Received Date</p>
                <p className="text-sm">{new Date(receivedAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            
            <div className="bg-white/50 p-3 rounded border border-green-100">
              <p className="text-xs font-medium text-green-800 mb-1">Next Step</p>
              <p className="text-sm">Quality Inspection</p>
              <p className="text-xs text-gray-600 mt-1">Seller has 3 days to inspect</p>
            </div>
          </div>

          {rr?.receipt_notes && (
            <div className="mt-3 p-3 bg-white/50 rounded border border-green-100">
              <p className="text-xs font-medium text-green-800 mb-1">Receipt Notes</p>
              <p className="text-sm text-gray-700">{rr.receipt_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminToVerifyStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const inspectionDeadline = rr?.inspection_deadline || null;
  
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <PackageCheck className="h-5 w-5 text-purple-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-purple-800">Quality Inspection Required</p>
              <p className="text-sm text-purple-700 mt-1">
                Item received. Seller must inspect condition and decide to accept or reject the return.
              </p>
            </div>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              To Inspect
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">Inspection Deadline</p>
              {inspectionDeadline ? (
                <>
                  <p className="text-sm">{new Date(inspectionDeadline).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {Math.ceil((new Date(inspectionDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
                  </p>
                </>
              ) : (
                <p className="text-sm">Within 3 business days</p>
              )}
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">Possible Outcomes</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Accept
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  Reject
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-purple-100">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                If seller doesn't inspect within deadline, refund may be automatically processed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminInspectedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rr = (refund as any).return_request || null;
  const inspectionResult = rr?.inspection_result || null;
  const inspectionNotes = rr?.inspection_notes || null;
  
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckSquare className="h-5 w-5 text-purple-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-purple-800">Inspection Complete</p>
              <p className="text-sm text-purple-700 mt-1">
                {inspectionResult ? 'Seller has inspected the item and submitted an inspection result.' : 'Seller has inspected the item. Waiting for decision.'}
              </p>
            </div>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              Inspected
            </Badge>
          </div>

          {inspectionResult && (
            <div className="mt-3 p-3 bg-white/50 rounded border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-800">Inspection Result</p>
                <Badge 
                  variant="outline" 
                  className={`${
                    inspectionResult === 'accepted' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {inspectionResult === 'accepted' ? 'Accepted' : 'Rejected'}
                </Badge>
              </div>
              
              {inspectionNotes && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Inspection Notes</p>
                  <p className="text-sm text-gray-700">{inspectionNotes}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">Next Step</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refund Processing
              </p>
            </div>
            
            {inspectionResult === 'accepted' && (
              <div className="bg-white/50 p-3 rounded border border-purple-100">
                <p className="text-xs font-medium text-purple-800 mb-1">Refund Amount</p>
                <p className="text-sm font-medium">₱{Number(refund.total_refund_amount || 0).toLocaleString()}</p>
                {refund.total_refund_amount != null && (
                  <p className="text-xs text-gray-500 mt-1">(using <span className="font-medium">total_refund_amount</span>)</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminToProcessStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const paymentMethod = refund.final_refund_method || refund.preferred_refund_method;
  
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-purple-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-purple-800">Ready for Refund Processing</p>
              <p className="text-sm text-purple-700 mt-1">
                All conditions met. Ready to process the refund payment.
              </p>
            </div>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              To Process
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                {paymentMethod === 'wallet' && <Wallet className="h-4 w-4" />}
                {paymentMethod === 'card' && <CreditCard className="h-4 w-4" />}
                {paymentMethod === 'bank' && <DollarSign className="h-4 w-4" />}
                <p className="text-sm font-medium">{paymentMethod || 'Not specified'}</p>
              </div>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">Amount to Refund</p>
              <p className="text-sm font-medium">₱{Number(refund.total_refund_amount || 0).toLocaleString()}</p>
              {refund.refund_fee && (
                <p className="text-xs text-gray-600 mt-1">Fee: ₱{Number(refund.refund_fee).toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-purple-100">
            <p className="text-xs font-medium text-purple-800 mb-1">Processing Instructions</p>
            <ol className="text-xs text-gray-700 list-decimal pl-4 space-y-1">
              <li>Verify the refund amount and payment method</li>
              <li>Process payment through the chosen method</li>
              <li>Update refund status to 'completed' once payment is sent</li>
              <li>Notify customer of successful refund</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDisputeStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const disputeReason = refund.dispute_reason || 'No reason provided';
  
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-orange-800">Under Dispute Review</p>
              <p className="text-sm text-orange-700 mt-1">
                This refund request has been escalated to admin review due to a dispute.
              </p>
            </div>
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
              Dispute
            </Badge>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-orange-100">
            <p className="text-xs font-medium text-orange-800 mb-1">Dispute Reason</p>
            <p className="text-sm text-gray-700">{disputeReason}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-orange-100">
              <p className="text-xs font-medium text-orange-800 mb-1">Admin Action Required</p>
              <p className="text-sm">Review dispute and make final decision</p>
            </div>
            
          
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCompletedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const paymentStatus = refund.refund_payment_status || 'completed';
  
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckSquare className="h-5 w-5 text-emerald-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-emerald-800">Refund Completed</p>
              <p className="text-sm text-emerald-700 mt-1">
                Refund has been successfully processed and completed.
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
              Completed
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-emerald-100">
              <p className="text-xs font-medium text-emerald-800 mb-1">Payment Status</p>
              <Badge 
                variant="outline" 
                className={`${
                  paymentStatus === 'completed' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
              >
                {paymentStatus === 'completed' ? 'Paid' : paymentStatus}
              </Badge>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-emerald-100">
              <p className="text-xs font-medium text-emerald-800 mb-1">Final Amount</p>
              <p className="text-sm font-medium">₱{Number(refund.total_refund_amount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-800 mb-1">Processed By</p>
                <p className="text-sm">{refund.processed_by_username || 'System'}</p>
              </div>
              {refund.processed_at && (
                <div className="text-right">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Completed Date</p>
                  <p className="text-sm">{new Date(refund.processed_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRejectedStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const rejectionReason = refund.rejection_reason || refund.reason || 'No reason provided';
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-800">Refund Rejected</p>
              <p className="text-sm text-red-700 mt-1">
                This refund request has been rejected by the seller.
              </p>
            </div>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              Rejected
            </Badge>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-red-100">
            <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason</p>
            <p className="text-sm text-gray-700">{rejectionReason}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-red-100">
              <p className="text-xs font-medium text-red-800 mb-1">Customer Option</p>
              <p className="text-sm">Customer can file a dispute within 7 days</p>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-red-100">
              <p className="text-xs font-medium text-red-800 mb-1">Date Rejected</p>
              <p className="text-sm">{refund.processed_at ? new Date(refund.processed_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminCancelledStatusUI({ refund }: { refund: RefundFlat & { [key: string]: any } }) {
  const cancellationReason = refund.cancelled_reason || 'No reason provided';
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Ban className="h-5 w-5 text-gray-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Refund Cancelled</p>
              <p className="text-sm text-gray-700 mt-1">
                This refund request has been cancelled.
              </p>
            </div>
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
              Cancelled
            </Badge>
          </div>

          <div className="mt-3 p-3 bg-white/50 rounded border border-gray-100">
            <p className="text-xs font-medium text-gray-800 mb-1">Cancellation Reason</p>
            <p className="text-sm text-gray-700">{cancellationReason}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded border border-gray-100">
              <p className="text-xs font-medium text-gray-800 mb-1">Initiated By</p>
              <p className="text-sm">{refund.processed_by_username || 'Customer'}</p>
            </div>
            
            <div className="bg-white/50 p-3 rounded border border-gray-100">
              <p className="text-xs font-medium text-gray-800 mb-1">Date Cancelled</p>
              <p className="text-sm">{refund.processed_at ? new Date(refund.processed_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
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

  // Try to fetch the authoritative admin refund details (ensures stored DB values like total_refund_amount are used)
  let enrichedRefund = refund;
  try {
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
      // Merge details into the flat refund record so UI picks up authoritative fields
      enrichedRefund = { ...refund, ...details };
      if (details.total_refund_amount != null && Number(details.total_refund_amount) !== Number(refund.total_refund_amount || 0)) {
        console.warn('Admin view: total_refund_amount mismatch between list and details', { refundId: refund.refund, listValue: refund.total_refund_amount, detailValue: details.total_refund_amount });
      }
    }
  } catch (err) {
    // Ignore detail fetch failures; fall back to list values
    console.error('Failed to fetch admin refund details', err);
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
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    const rr = (refund as any).return_request || null;
    const rrStatus = String(rr?.status || '').toLowerCase();

    // Explicit rule: if refund is approved and payment is completed, show completed UI
    const isApproved = String(refund.status || '').toLowerCase() === 'approved';
    const paymentCompletedExact = String((refund.refund_payment_status || '')).toLowerCase().trim() === 'completed';
    if (isApproved && paymentCompletedExact) {
      return <AdminCompletedStatusUI refund={refund} />;
    }

    // Map status to appropriate UI component
    switch (status ) {
      case 'pending':
        return <AdminPendingStatusUI refund={refund} />;
      
      case 'negotiation':
        return <AdminNegotiationStatusUI refund={refund} />;
      
      case 'approved':
        // If payment already completed, show completed UI
        const paymentCompleted = String(refund.refund_payment_status || '').toLowerCase() === 'completed';
        if (paymentCompleted) {
          return <AdminCompletedStatusUI refund={refund} />;
        }

        // Check if this is a return and prefer return-specific UIs when a return_request exists
        const isReturn = String((refund.final_refund_type || '').toLowerCase()) === 'return' || 
                        String((refund.refund_type || '').toLowerCase()) === 'return';
        const paymentPending = String(refund.refund_payment_status || '').toLowerCase() === 'pending' || 
                              !refund.refund_payment_status;

        // If this is a return, and there's a ReturnRequestItem, show waiting/shipped/received UIs accordingly
        if (isReturn) {
          if (rr) {
            const rrStatus = String(rr.status || '').toLowerCase();
            const hasTracking = Boolean(rr.tracking_number || refund.tracking_number);

            // If returned item already received, show Received UI regardless of tracking
            if (rrStatus === 'received') {
              return <AdminReceivedStatusUI refund={refund} />;
            }

            // If return has been inspected by seller, show Inspected UI where seller will decide to accept/reject
            if (rrStatus === 'inspected') {
              return <AdminInspectedStatusUI refund={refund} />;
            }

            // If shipped or tracking exists, consider processing condition first
            if (rrStatus === 'shipped' || hasTracking) {
              const finalTypeLocal = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
              // If seller accepted the return and payment is still pending, move to ToProcess so admin can process refund
              if (paymentPending && String(refund.status || '').toLowerCase() === 'approved' && finalTypeLocal === 'return') {
                return <AdminToProcessStatusUI refund={refund} />;
              }
              return <AdminShippedStatusUI refund={refund} />;
            }

            // Not shipped yet - waiting for customer to ship
            return <AdminWaitingStatusUI refund={refund} />;
          }

          // No return_request record yet - fall back to waiting when payment is pending
          if (paymentPending) {
            return <AdminWaitingStatusUI refund={refund} />;
          }
        }

        return <AdminApprovedStatusUI refund={refund} />;
      
      case 'waiting':
        return <AdminWaitingStatusUI refund={refund} />;
      
      case 'shipped':
        return <AdminShippedStatusUI refund={refund} />;
      
      case 'received':
        return <AdminReceivedStatusUI refund={refund} />;
      
      case 'to_verify':
        return <AdminToVerifyStatusUI refund={refund} />;
      
      case 'inspected':
        return <AdminInspectedStatusUI refund={refund} />;
      
      case 'to_process':
        return <AdminToProcessStatusUI refund={refund} />;
      
      case 'dispute':
        return <AdminDisputeStatusUI refund={refund} />;
      
      case 'completed':
        return <AdminCompletedStatusUI refund={refund} />;
      
      case 'rejected':
        return <AdminRejectedStatusUI refund={refund} />;
      
      case 'cancelled':
        return <AdminCancelledStatusUI refund={refund} />;
      
      default:
        // Handle return_request status if main status doesn't match
        switch (rrStatus) {
          case 'shipped':
            // If seller accepted the return and payment is pending, promote to To Process so admin can process refund
            const finalTypeLocalDefault = String(refund.final_refund_type || refund.refund_type || '').toLowerCase();
            const paymentPendingDefault = String(refund.refund_payment_status || '').toLowerCase() === 'pending' || !refund.refund_payment_status;
            if (String(refund.status || '').toLowerCase() === 'approved' && paymentPendingDefault && finalTypeLocalDefault === 'return') {
              return <AdminToProcessStatusUI refund={refund} />;
            }
            return <AdminShippedStatusUI refund={refund} />;
          case 'received':
            return <AdminReceivedStatusUI refund={refund} />;
          case 'inspected':
            return <AdminInspectedStatusUI refund={refund} />;
          default:
            // Fallback to waiting status for approved returns
            const isReturnFallback = String((refund.final_refund_type || '').toLowerCase()) === 'return';
            if (isReturnFallback && status === 'approved') {
              return <AdminWaitingStatusUI refund={refund} />;
            }
            return null;
        }
    }
  };

  const st = String(refund.status || '').toLowerCase();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> Refund {refund.refund}
                <Badge variant="secondary" className="ml-2">
                  {refund.status || 'pending'}
                </Badge>
              </CardTitle>
              <CardDescription>Admin view — details and actions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-sm text-muted-foreground">
                <div>Requested: {refund.requested_at || 'N/A'}</div>
                <div>Processed: {refund.processed_at || 'N/A'}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="space-y-4">
                <section>
                  <h4 className="text-sm font-semibold">Customer</h4>
                  <div className="text-sm text-muted-foreground">{refund.requested_by_username} • {refund.requested_by_email}</div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold">Order</h4>
                  <div className="text-sm text-muted-foreground">Order ID: {refund.order_id || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Order Total: ₱{Number(refund.order_total_amount || 0).toLocaleString()}</div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold">Amounts</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>Total refund amount: <strong>₱{refund.total_refund_amount ?? 'N/A'}</strong></div>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold">Reason</h4>
                  <div className="text-sm">{refund.reason || 'No reason provided'}</div>
                </section>

                {/* Status-specific UI */}
                {renderStatusUI()}

                <section>
                  <h4 className="text-sm font-semibold">Shipping / Logistics</h4>
                  {
                    // Prefer return_request details (if present), otherwise use top-level fields
                  }
                  <div className="text-sm text-muted-foreground">
                    {refund.return_request?.logistic_service || refund.logistic_service || 'N/A'} • {refund.return_request?.tracking_number || refund.tracking_number || 'N/A'}
                  </div>

                  {refund.return_request?.tracking_url && (
                    <div className="text-sm mt-1">
                      <a href={refund.return_request.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Track Package →</a>
                    </div>
                  )}

                  {refund.return_request?.shipped_at && (
                    <div className="text-sm mt-1">Shipped: {new Date(refund.return_request.shipped_at).toLocaleDateString()}</div>
                  )}

                  {refund.return_request?.received_at && (
                    <div className="text-sm mt-1">Received: {new Date(refund.return_request.received_at).toLocaleDateString()}</div>
                  )}
                </section>

                <section>
                  <h4 className="text-sm font-semibold">Methods</h4>
                  <div className="text-sm text-muted-foreground">Buyer preferred: {refund.preferred_refund_method || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">Final: {refund.final_refund_method || 'N/A'}</div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold">Media</h4>
                  <div className="text-sm text-muted-foreground">Has media: {refund.has_media ? 'Yes' : 'No'} • Count: {refund.media_count || 0}</div>
                </section>
              </div>
            </div>

            <aside className="">
              <div className="space-y-4">
                <Card>
                  <CardContent id="admin-actions">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Admin Actions</div>
                      <div className="flex flex-col gap-2">
                                {/* Hide 'Proceed to process' when refund is already completed */}
                        {!(String(refund.status || '').toLowerCase() === 'approved' && String(refund.refund_payment_status || '').toLowerCase().trim() === 'completed') && (
                          <Button
                            disabled={processing || !(st === 'approved' || st === 'dispute')}
                            onClick={async () => {
                              const st = String(refund.status || '').toLowerCase();
                              if (st.includes('negotiation')) {
                                setShowConfirmModal(true);
                                return;
                              }
                              if (st === 'dispute') {
                                try {
                                  setProcessing(true);
                                  // Fetch dispute by refund_id
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
                                  // Start review to set dispute.status = under_review
                                  await AxiosInstance.post(`/disputes/${first.id}/start_review/`, null, {
                                    headers: { 'X-User-Id': String(user?.id || '') }
                                  });
                                  toast({ title: 'Review started', description: 'Dispute marked under review.' });
                                  navigate(`/admin/view-refund/review-dispute/${refund.refund}`);
                                } catch (err) {
                                  console.error('Start review error', err);
                                  toast({ title: 'Failed to start review', description: String(err), variant: 'destructive' });
                                } finally {
                                  setProcessing(false);
                                }
                                return;
                              }
                              navigate(`/admin/view_refund/process-refund/${refund.refund}`);
                            }}
                            className="w-full"
                          >
                            {st === 'dispute' ? (
                              <>
                                <ShieldAlert className="w-4 h-4 mr-2" /> Start Review
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" /> Proceed to process
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Meta</div>
                    {refund.processed_by_username && (
                      <div className="text-sm">Processed by: {refund.processed_by_username}</div>
                    )}
                    {refund.processed_by_email && (
                      <div className="text-sm">Processed email: {refund.processed_by_email}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog when admin overrides active negotiation */}
      <Dialog open={showConfirmModal} onOpenChange={(open) => setShowConfirmModal(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proceed to process refund?</DialogTitle>
            <DialogDescription>
              This refund is currently under negotiation between the buyer and the seller. Processing it now will bypass or close the negotiation. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button
              className="ml-2"
              onClick={() => {
                setShowConfirmModal(false);
                navigate(`/admin/view-refund/process-refund/${refund.refund}`);
              }}
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}