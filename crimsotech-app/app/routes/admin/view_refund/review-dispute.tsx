"use client";

import React, { useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  CreditCard,
  ShoppingBag,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Truck,
  
} from 'lucide-react';
import { useToast } from '~/hooks/use-toast';
import AxiosInstance from '~/components/axios/Axios';

// Loader: fetch admin refund details
export async function loader({ request, params }: any) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const refundId = params?.refundId || new URL(request.url).searchParams.get('refund') || '';
  if (!refundId) throw new Response('refund id required', { status: 400 });

  try {
    const response = await AxiosInstance.get(
      `/return-refund/${encodeURIComponent(String(refundId))}/get_admin_refund_details/`,
      {
        headers: {
          'X-User-Id': String(userId)
        }
      }
    );

    return { refund: response.data, user: { id: userId, isAdmin: true } } as LoaderData;
  } catch (error: any) {
    console.error('Error fetching refund details:', error);
    throw new Response(
      error.response?.data?.error || 'Failed to fetch refund details', 
      { status: error.response?.status || 500 }
    );
  }
}

type LoaderData = {
  refund: any;
  user?: any;
};

export default function ReviewDispute() {
  const data = useLoaderData<LoaderData | undefined>();
  if (!data || !data.refund) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load refund details. Please go back and try again.
        </div>
      </div>
    );
  }
  const { refund, user } = data;
  const navigate = useNavigate();
  const { toast } = useToast();

  const order = (refund && (refund.order || refund.order_details || {})) || {};
  const rr = refund.return_request || null;
  const dispute = refund.dispute || null;
  const disputesList = Array.isArray(refund.disputes) ? refund.disputes : [];
  const activeDisputeId = (dispute && dispute.id) || (disputesList[0] && disputesList[0].id) || null;
  const disputeToShow = dispute || disputesList[0] || null;

  const [showPartial, setShowPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const initialUiState: 'review' | 'approved' | 'declined' | 'partial' = (() => {
    const dst = String((disputeToShow?.status || '')).toLowerCase();
    if (dst === 'approved') return 'approved';
    if (dst === 'rejected' || dst === 'declined') return 'declined';
    if (dst === 'partial') return 'partial';
    return 'review';
  })();
  const [canProcess, setCanProcess] = useState(initialUiState === 'approved' || initialUiState === 'partial');
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isPartialSubmitting, setIsPartialSubmitting] = useState(false);
  const [uiState, setUiState] = useState<'review' | 'approved' | 'declined' | 'partial'>(initialUiState);
  const [lastPartial, setLastPartial] = useState<{ amount?: number }>({});

  // Helper function to refresh data
  const refreshData = async () => {
    try {
      const response = await AxiosInstance.get(
        `/return-refund/${refund.refund || refund.refund_id}/get_admin_refund_details/`,
        {
          headers: {
            'X-User-Id': String(user?.id || '')
          }
        }
      );
      
      if (response.data) {
        const updatedDispute = response.data.dispute || (Array.isArray(response.data.disputes) ? response.data.disputes[0] : null);
        const dst = String(updatedDispute?.status || '').toLowerCase();
        
        if (dst === 'approved') {
          setUiState('approved');
          setCanProcess(true);
        } else if (dst === 'rejected' || dst === 'declined') {
          setUiState('declined');
          setCanProcess(false);
        } else if (dst === 'partial') {
          setUiState('partial');
          setCanProcess(true);
          // sync lastPartial amount from refund if available
          const amt = response.data.approved_refund_amount;
          if (typeof amt === 'number') {
            setLastPartial({ amount: amt });
          }
        } else {
          setUiState('review');
          setCanProcess(false);
        }
        
        return response.data;
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // APPROVE DISPUTE - CORRECTED: Call the DisputeViewSet's accept endpoint
  const handleApprove = async (): Promise<void> => {
    if (!activeDisputeId) {
      toast({ 
        title: 'No dispute found', 
        description: 'This refund has no dispute to approve.',
        variant: 'destructive'
      });
      return;
    }

    setIsApproving(true);
    try {
      // CORRECT ENDPOINT: /disputes/{dispute_id}/accept/
      const response = await AxiosInstance.post(
        `/disputes/${activeDisputeId}/accept/`,
        {
          admin_notes: 'Dispute approved by admin',
        },
        {
          headers: {
            'X-User-Id': String(user?.id || '')
          }
        }
      );

      if (response.data) {
        // Update UI state
        setUiState('approved');
        setCanProcess(true);
        
        // Refresh the data to get updated status
        await refreshData();
        
        toast({ 
          title: 'Dispute Approved', 
          description: 'The dispute has been approved. Refund is now in processing.' 
        });
      }
    } catch (error: any) {
      console.error('Approve error:', error);
      
      let errorMessage = 'Failed to approve dispute';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // DECLINE DISPUTE - CORRECTED: Call the DisputeViewSet's reject endpoint
  const handleDecline = async (): Promise<void> => {
    if (!activeDisputeId) {
      toast({ 
        title: 'No dispute found', 
        description: 'This refund has no dispute to decline.',
        variant: 'destructive'
      });
      return;
    }

    setIsDeclining(true);
    try {
      // CORRECT ENDPOINT: /disputes/{dispute_id}/reject/
      const response = await AxiosInstance.post(
        `/disputes/${activeDisputeId}/reject/`,
        {
          admin_notes: 'Dispute declined by admin',
        },
        {
          headers: {
            'X-User-Id': String(user?.id || '')
          }
        }
      );

      if (response.data) {
        // Update UI state
        setUiState('declined');
        setCanProcess(false);
        
        // Refresh the data
        await refreshData();
        
        toast({ 
          title: 'Dispute Declined', 
          description: 'The dispute has been declined.' 
        });
      }
    } catch (error: any) {
      console.error('Decline error:', error);
      
      let errorMessage = 'Failed to decline dispute';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsDeclining(false);
    }
  };

  // START REVIEW - If you need this action
  const handleStartReview = async () => {
    if (!activeDisputeId) return;
    
    try {
      const response = await AxiosInstance.post(
        `/disputes/${activeDisputeId}/start_review/`,
        {},
        {
          headers: {
            'X-User-Id': String(user?.id || '')
          }
        }
      );
      
      if (response.data) {
        toast({ 
          title: 'Review Started', 
          description: 'Dispute is now under review.' 
        });
        await refreshData();
      }
    } catch (error: any) {
      console.error('Start review error:', error);
      
      let errorMessage = 'Failed to start review';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // PARTIAL DECISION - UI-only, mark dispute as partial (no processing yet)
  const handlePartialConfirm = async (): Promise<void> => {
    setIsPartialSubmitting(true);
    try {
      const id = refund?.refund || refund?.refund_id;
      const amount = Number(partialAmount);
      
      if (!id) {
        toast({ 
          title: 'Missing refund id', 
          description: 'Cannot submit partial refund without an id.',
          variant: 'destructive'
        });
        return;
      }
      
      if (isNaN(amount) || amount <= 0) {
        toast({ 
          title: 'Invalid amount', 
          description: 'Please enter a valid partial amount.',
          variant: 'destructive'
        });
        return;
      }
      // Call DisputeViewSet partial endpoint to mark decision only
      const response = await AxiosInstance.post(
        `/disputes/${activeDisputeId}/partial/`,
        {
          partial_amount: amount,
          admin_notes: 'Moderation decided on partial refund',
        },
        {
          headers: {
            'X-User-Id': String(user?.id || '')
          }
        }
      );

      if (response.data) {
        setShowPartial(false);
        setPartialAmount('');
        setLastPartial({ amount });
        setUiState('partial');
        setCanProcess(true);
        
        // Refresh data
        await refreshData();
      }
    } catch (error: any) {
      console.error('Partial refund error:', error);
      
      let errorMessage = 'Failed to process partial refund';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsPartialSubmitting(false);
    }
  };

  // Helper function to get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'partial':
        return 'secondary';
      case 'pending':
      case 'under_review':
        return 'outline';
      case 'rejected':
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | number; icon?: React.ElementType }) => (
    <div className="flex items-start justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right">
        {typeof value === 'number' && !isNaN(value) && label.toLowerCase().includes('amount') 
          ? `₱${value.toLocaleString()}`
          : value || 'N/A'}
      </div>
    </div>
  );

  // If dispute is pending or under_review, show Start Review button
  const showStartReview = disputeToShow?.status?.toLowerCase() === 'filed' || 
                         disputeToShow?.status?.toLowerCase() === 'pending';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dispute Review</h1>
              <p className="text-sm text-muted-foreground">
                Refund ID: {refund.refund || refund.refund_id}
              </p>
            </div>
          </div>
          <Badge variant={getStatusVariant(refund.status)} className="px-3 py-1">
            {refund.status || 'N/A'}
          </Badge>
        </div>

        {/* State Banner (top) */}
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            {uiState === 'review' && (
              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Dispute Under Review</p>
                  <p className="text-sm text-amber-700">Please choose to approve, decline, or set a partial refund below.</p>
                </div>
              </div>
            )}
            {uiState === 'approved' && (
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800">Dispute Approved</p>
                  <p className="text-sm text-emerald-700">Refund has been approved. You can proceed to process the refund.</p>
                </div>
              </div>
            )}
            {uiState === 'declined' && (
              <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Dispute Declined</p>
                  <p className="text-sm text-red-700">The refund request has been declined.</p>
                </div>
              </div>
            )}
            {uiState === 'partial' && (
              <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Partial Refund Decision</p>
                  <p className="text-sm text-blue-700">The moderation team decided to issue a partial refund. Amount: ₱{Number((refund?.approved_refund_amount ?? lastPartial.amount ?? 0) as number).toLocaleString()}. You can now proceed to process the refund.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order & Request Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Order Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Dispute Reason</Label>
                      <p className="text-sm font-medium">{disputeToShow?.reason || refund.dispute_reason || 'N/A'}</p>
                    </div>
                    <Label className="text-xs font-medium text-muted-foreground">Order Total</Label>
                    <p className="font-medium">
                      ₱{Number(refund.order_total_amount || order.total_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Payment Method</Label>
                    <p className="font-medium">{order.payment_method || refund.payment_method || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Delivery Method</Label>
                    <p className="font-medium">{order.delivery_method || refund.delivery_method || 'N/A'}</p>
                  </div>
                </div>
                {order.delivery_address_text && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Delivery Address</Label>
                    <p className="text-sm">{order.delivery_address_text}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Request & Refund Details Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Request & Refund Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Request Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                      label="Requested By" 
                      value={refund.requested_by_username || refund.requested_by_email || 'N/A'}
                    />
                    <InfoRow 
                      label="Requested At" 
                      value={refund.requested_at || 'N/A'}
                    />
                  </div>
                  {refund.customer_note && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <Label className="text-xs font-medium text-muted-foreground">Buyer Note</Label>
                      <p className="text-sm mt-1">{refund.customer_note}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-3">Refund Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Refund Type" value={refund.final_refund_type || refund.refund_type || 'N/A'} />
                    <InfoRow label="Refund Method" value={refund.final_refund_method || refund.preferred_refund_method || 'N/A'} />
                    <InfoRow label="Total Amount" value={Number(refund.total_refund_amount || 0)} />
                    <InfoRow label="Payment Status" value={refund.refund_payment_status || 'N/A'} />
                    <InfoRow label="Processed By" value={refund.processed_by_username || refund.processed_by_email || 'N/A'} />
                    <InfoRow label="Processed At" value={refund.processed_at || 'N/A'} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Additional Info */}
          <div className="space-y-6">
            {/* Dispute Details Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Dispute Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Dispute Reason</Label>
                    <p className="text-sm font-medium">{disputeToShow?.reason || refund.dispute_reason || 'N/A'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                      <Badge variant={getStatusVariant(disputeToShow?.status)}>
                        {disputeToShow?.status || 'N/A'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Resolved At</Label>
                      <p className="text-sm">{disputeToShow?.resolved_at || 'N/A'}</p>
                    </div>
                  </div>

                  {disputeToShow?.status?.toLowerCase() === 'partial' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Partial Amount</Label>
                      <p className="text-sm font-medium">₱{Number((refund?.approved_refund_amount ?? 0) as number).toLocaleString()}</p>
                    </div>
                  )}

                  {disputeToShow?.admin_notes && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Admin Notes</Label>
                      <p className="text-sm bg-amber-50 p-3 rounded-md border border-amber-100">
                        {disputeToShow.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Return Details Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Return Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Return Status</Label>
                    <Badge variant={getStatusVariant(rr?.status)}>
                      {rr?.status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Tracking Number</Label>
                    <p className="text-sm font-medium">{rr?.tracking_number || refund.tracking_number || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Logistic Service</Label>
                    <p className="text-sm">{rr?.logistic_service || refund.logistic_service || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Inspection Result</Label>
                    <p className="text-sm">{rr?.inspection_result || 'N/A'}</p>
                  </div>
                </div>
                {(rr?.shipped_at || rr?.received_at) && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    {rr?.shipped_at && (
                      <InfoRow 
                        label="Shipped At" 
                        value={new Date(rr.shipped_at).toLocaleDateString()}
                        icon={Calendar}
                      />
                    )}
                    {rr?.received_at && (
                      <InfoRow 
                        label="Received At" 
                        value={new Date(rr.received_at).toLocaleDateString()}
                        icon={Calendar}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="border shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col gap-3">
                  {/* Start Review Button (if dispute is filed/pending) */}
                  {showStartReview && (
                    <Button 
                      variant="outline" 
                      onClick={handleStartReview}
                      className="gap-2 h-11"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Start Review
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="default" 
                      onClick={handleApprove} 
                      disabled={isApproving || uiState === 'approved'}
                      className="gap-2 h-11"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isApproving ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDecline} 
                      disabled={isDeclining || uiState === 'declined'}
                      className="gap-2 h-11"
                    >
                      <XCircle className="h-4 w-4" />
                      {isDeclining ? 'Declining...' : 'Decline'}
                    </Button>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={() => setShowPartial(!showPartial)}
                    disabled={isPartialSubmitting}
                    className="gap-2 h-11"
                  >
                    <DollarSign className="h-4 w-4" />
                    Partial Refund
                  </Button>

                  <Button 
                    variant="default"
                    disabled={!canProcess}
                    onClick={() => navigate(`/admin/view-refund/process-refund/${refund.refund || refund.refund_id}`)}
                    className="gap-2 h-11"
                  >
                    <CreditCard className="h-4 w-4" />
                    Process Refund
                  </Button>
                </div>

                {showPartial && (
                  <div className="space-y-4 border rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">Partial Refund Selected</p>
                        <p className="text-amber-700">Enter the partial amount to apply, then confirm. After confirming, you can proceed to process the refund.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partialAmount">Partial Refund Amount</Label>
                      <Input
                        id="partialAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="h-10"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={handlePartialConfirm} 
                        disabled={isPartialSubmitting}
                        className="flex-1 gap-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        {isPartialSubmitting ? 'Submitting...' : 'Confirm'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowPartial(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}