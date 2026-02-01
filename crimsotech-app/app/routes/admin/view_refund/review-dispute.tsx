"use client";

import React from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '~/hooks/use-toast';

export async function loader({ request, params }: any) {
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');
  if (!userId) throw new Response('Unauthorized', { status: 401 });

  const refundId = params?.refundId || new URL(request.url).searchParams.get('refund') || '';
  if (!refundId) throw new Response('refund id required', { status: 400 });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const detailEndpoint = `${API_BASE_URL}/return-refund/${encodeURIComponent(String(refundId))}/get_admin_refund_details/`;

  const res = await fetch(detailEndpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-User-Id': String(userId)
    },
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Response(text || 'Failed to fetch refund details', { status: res.status });
  }

  const details = await res.json();
  return { refund: details, user: { id: userId, isAdmin: true } };
}

export default function ReviewDispute() {
  const { refund } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const order = (refund && (refund.order || refund.order_details || {})) || {};
  const rr = refund.return_request || null;
  const dispute = refund.dispute || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Dispute Review — Refund {refund.refund || refund.refund_id}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="col-span-1 space-y-3">
              <h4 className="text-sm font-semibold">Order Details</h4>
              <div className="text-sm text-muted-foreground">
                <div>Order ID: {refund.order_id || order.order || 'N/A'}</div>
                <div>Order Total: ₱{Number(refund.order_total_amount || order.total_amount || 0).toLocaleString()}</div>
                <div>Payment Method: {order.payment_method || refund.payment_method || 'N/A'}</div>
                <div>Delivery Method: {order.delivery_method || refund.delivery_method || 'N/A'}</div>
                {order.delivery_address_text && <div>Delivery Address: {order.delivery_address_text}</div>}
              </div>

              <h4 className="text-sm font-semibold mt-4">Request Details</h4>
              <div className="text-sm text-muted-foreground">
                <div>Requested by: {refund.requested_by_username || refund.requested_by_email || 'N/A'}</div>
                <div>Requested at: {refund.requested_at || 'N/A'}</div>
                <div>Reason: {refund.reason || 'N/A'}</div>
                {refund.customer_note && <div>Buyer note: {refund.customer_note}</div>}
                {refund.has_media && <div>Media attached: {refund.media_count || 0}</div>}
              </div>

              <h4 className="text-sm font-semibold mt-4">Refund Details</h4>
              <div className="text-sm text-muted-foreground">
                <div>Refund ID: {refund.refund || refund.refund_id}</div>
                <div>Status: {refund.status || 'N/A'}</div>
                <div>Final Type: {refund.final_refund_type || refund.refund_type || 'N/A'}</div>
                <div>Final Method: {refund.final_refund_method || refund.preferred_refund_method || 'N/A'}</div>
                <div>Total Amount: ₱{Number(refund.total_refund_amount || 0).toLocaleString()}</div>
                <div>Payment Status: {refund.refund_payment_status || 'N/A'}</div>
                <div>Processed by: {refund.processed_by_username || refund.processed_by_email || 'N/A'}</div>
                <div>Processed at: {refund.processed_at || 'N/A'}</div>
              </div>
            </section>

            <section className="col-span-1 space-y-3">
              <h4 className="text-sm font-semibold">Delivery / Return Details</h4>
              <div className="text-sm text-muted-foreground">
                <div>Return request: {rr ? rr.return_id || 'exists' : 'No return record'}</div>
                <div>Return status: {rr?.status || 'N/A'}</div>
                <div>Tracking: {rr?.tracking_number || refund.tracking_number || 'N/A'}</div>
                <div>Logistic service: {rr?.logistic_service || refund.logistic_service || 'N/A'}</div>
                {rr?.shipped_at && <div>Shipped at: {new Date(rr.shipped_at).toLocaleDateString()}</div>}
                {rr?.received_at && <div>Received at: {new Date(rr.received_at).toLocaleDateString()}</div>}
                {rr?.inspection_result && <div>Inspection result: {rr.inspection_result}</div>}
              </div>

              <h4 className="text-sm font-semibold mt-4">Dispute Details</h4>
              <div className="text-sm text-muted-foreground">
                <div>Dispute Reason: {dispute?.reason || refund.dispute_reason || 'N/A'}</div>
                <div>Dispute Status: {dispute?.status || refund.status || 'N/A'}</div>
                <div>Processed by: {dispute?.processed_by_username || dispute?.processed_by_email || 'N/A'}</div>
                <div>Resolved at: {dispute?.resolved_at || 'N/A'}</div>
                {dispute?.admin_notes && <div>Admin notes: {dispute.admin_notes}</div>}
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate(-1)} variant="outline">Back</Button>
                <Button onClick={() => navigate(`/admin/view-refund/process-refund/${refund.refund || refund.refund_id}`)}>
                  Process Dispute
                </Button>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
