import type { Route } from "./+types/view-details";
import { data } from "react-router";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  let user = (context as any).user;
  if (!user) user = await fetchUserRole({ request, context });

  await requireRole(request, context, ["isAdmin"]);

  return data({
    user,
    disputeId: params.disputeId,
  });
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useToast } from '~/hooks/use-toast';
import { Badge } from '~/components/ui/badge';

type RefundDetails = {
  id?: string;
  refund?: string;
  request_number?: string;
  requested_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  refund_method?: string | null;
  total_refund_amount?: number | null;
  refund_reason?: string | null;
  customer_note?: string | null;
  admin_note?: string | null;
  admin_response?: string | null;
  available_actions?: any;
  // Optional: proofs uploaded by admin when completing refunds
  proofs?: Array<{ id?: string; file_url?: string | null; file_type?: string | null; file_data?: string | null }>;
  // Optional processed-by fields supplied by backend
  processed_by_username?: string | null;
  processed_by_email?: string | null;
  processed_at?: string | null;
  refund_payment_status?: string | null;
  order_info?: {
    order_number?: string | null;
    order_id?: string | null;
    total_amount?: number | null;
    payment_method?: string | null;
    delivery_address_text?: string | null;
  };
  shops?: Array<{ id?: string | null; name?: string | null; owner?: any }>;
  order_items?: Array<{
    id?: string;
    quantity?: number;
    total_amount?: number | null;
    status?: string | null;
    product?: {
      id?: string;
      name?: string;
      price?: number | null;
      condition?: string | null;
      shop?: { id?: string | null; name?: string | null };
    };
  }>;
  delivery?: {
    id?: string | null;
    status?: string | null;
    picked_at?: string | null;
    delivered_at?: string | null;
    tracking_number?: string | null;
    rider_id?: string | null;
  } | null;
};

type ShopDetails = {
  id: string;
  name?: string;
  owner?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    contact_number?: string | null;
  } | null;
  [k: string]: any;
};

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

// Local helper to sanitize notes shown to admins: remove seller approval lines and dedupe
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

type DisputeDetail = {
  id: string;
  order?: string | null;
  order_number?: string | null;
  refund?: string | null;
  filed_by?: string | null;
  filed_by_name?: string | null;
  reason?: string | null;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  evidence?: Array<{
    id: string;
    file_url?: string | null;
    uploaded_by_name?: string | null;
    created_at?: string | null;
  }>;
};

export default function AdminViewDisputeDetails({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { disputeId, user } = loaderData as any;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [refund, setRefund] = useState<RefundDetails | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState<Record<string, ShopDetails>>({});
  const [error, setError] = useState<string | null>(null);

  const getFiledByName = (d?: DisputeDetail | null) => {
    if (!d) return 'Unknown';
    const r = (d as any).requested_by;
    if (r) {
      const first = r.first_name || r.name || r.given_name;
      const last = r.last_name || r.family_name;
      if (first && last) return `${first} ${last}`;
      return r.username || r.email || r.id || 'Unknown';
    }
    return d.filed_by_name || d.filed_by || 'Unknown';
  };

  const getFiledByRole = (d?: DisputeDetail | null) => {
    if (!d) return null;
    const r = (d as any).requested_by;
    if (r) {
      if (r.is_admin) return 'Admin';
      if (r.is_customer) return 'Buyer';
      // No explicit 'is_seller' flag available in user serializer — fallback to 'Seller'
      return 'Seller';
    }
    // Allow backend to supply a legacy role string
    const legacy = (d as any).filed_by_role;
    if (legacy) return String(legacy);
    return null;
  };

  const apiBase = useMemo(() => {
    const raw = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";
    return raw.replace(/\/+$/, "");
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        setRefund(null);
        setRefundError(null);
        setRefundLoading(false);
        setShopDetails({});

        const headers: Record<string, string> = { Accept: "application/json" };
        const userId = user?.user_id || user?.id;
        if (userId) headers["X-User-Id"] = String(userId);

        const res = await fetch(`${apiBase}/disputes/${encodeURIComponent(disputeId)}/`, {
          method: "GET",
          headers,
          credentials: "include",
        });

        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok) {
          // try extract JSON error, else text
          let msg = `Failed to load dispute (${res.status})`;
          try {
            if (ct.includes('application/json')) {
              const j = await res.json();
              msg = j?.error || j?.detail || msg;
            } else {
              const txt = await res.text().catch(() => '');
              msg = txt ? txt.slice(0, 500) : msg;
            }
          } catch (e) {
            // ignore
          }
          throw new Error(msg);
        }

        if (!ct.includes('application/json')) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt ? txt.slice(0, 500) : 'Unexpected non-JSON response from server');
        }

        const data = await res.json();
        setDispute(data);

        // The API may return `refund` as either a string id or a small object; normalize
        const refundIdRaw = data?.refund;
        const refundId = typeof refundIdRaw === 'string' ? refundIdRaw : (refundIdRaw?.refund_id || refundIdRaw?.id || null);
        if (refundId) {
          setRefundLoading(true);
          setRefundError(null);
          const refundRes = await fetch(
            `${apiBase}/return-refund/${encodeURIComponent(String(refundId))}/get_admin_refund_details/`,
            {
              method: "GET",
              headers,
              credentials: "include",
            },
          );

          const refundCt = (refundRes.headers.get('content-type') || '').toLowerCase();
          if (!refundRes.ok) {
            let msg = `Failed to load refund details (${refundRes.status})`;
            try {
              if (refundCt.includes('application/json')) {
                const j = await refundRes.json();
                msg = j?.error || j?.detail || msg;
              } else {
                const txt = await refundRes.text().catch(() => '');
                msg = txt ? txt.slice(0,500) : msg;
              }
            } catch (e) {}
            setRefund(null);
            setRefundError(msg);
            setRefundLoading(false);
            return;
          }

          if (!refundCt.includes('application/json')) {
            const txt = await refundRes.text().catch(() => '');
            setRefund(null);
            setRefundError(txt ? txt.slice(0,500) : 'Unexpected non-JSON response when loading refund');
            setRefundLoading(false);
            return;
          }

          const refundData = await refundRes.json();
          setRefund(refundData);

          const shops = Array.isArray(refundData?.shops) ? refundData.shops : [];
          const shopIds = shops.map((s: any) => s?.id).filter(Boolean);

          if (shopIds.length > 0) {
            const entries = await Promise.all(
              shopIds.map(async (shopId: string) => {
                try {
                  const shopRes = await fetch(`${apiBase}/shops/${encodeURIComponent(shopId)}/`, {
                    method: "GET",
                    headers,
                    credentials: "include",
                  });
                  if (!shopRes.ok) return null;
                  const payload = (await shopRes.json()) as ShopDetails;
                  return [shopId, payload] as const;
                } catch {
                  return null;
                }
              }),
            );

            const next: Record<string, ShopDetails> = {};
            for (const e of entries) {
              if (!e) continue;
              next[e[0]] = e[1];
            }
            setShopDetails(next);
          }

          setRefundLoading(false);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dispute");
      } finally {
        setLoading(false);
      }
    };

    if (disputeId) run();
  }, [apiBase, disputeId, user?.id, user?.user_id]);

  const safeUserId = user?.user_id || user?.id;

  const [actionLoading, setActionLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const handleAccept = async () => {
    if (!dispute?.id) return;
    try {
      setActionLoading(true);
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (safeUserId) headers['X-User-Id'] = String(safeUserId);
      const res = await fetch(`${apiBase}/disputes/${encodeURIComponent(String(dispute.id))}/accept/`, { method: 'POST', headers, credentials: 'include' });
      if (!res.ok) {
        let msg = `Failed to approve (${res.status})`;
        try { const j = await res.json(); msg = j?.error || j?.detail || msg; } catch (_) {}
        throw new Error(msg);
      }
      const payload = await res.json();
      setDispute(payload);
      toast?.({ title: 'Approved', description: 'Dispute approved', variant: 'success' });
    } catch (e: any) {
      console.error('Approve failed', e);
      toast?.({ title: 'Failed', description: e?.message || 'Failed to approve dispute', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!dispute?.id) return;
    try {
      const notes = window.prompt('Optional admin notes for rejection:');
      setActionLoading(true);
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (safeUserId) headers['X-User-Id'] = String(safeUserId);
      const res = await fetch(`${apiBase}/disputes/${encodeURIComponent(String(dispute.id))}/reject/`, { method: 'POST', headers, body: JSON.stringify({ admin_notes: notes }), credentials: 'include' });
      if (!res.ok) {
        let msg = `Failed to reject (${res.status})`;
        try { const j = await res.json(); msg = j?.error || j?.detail || msg; } catch (_) {}
        throw new Error(msg);
      }
      const payload = await res.json();
      setDispute(payload);
      toast?.({ title: 'Rejected', description: 'Dispute rejected', variant: 'success' });
    } catch (e: any) {
      console.error('Reject failed', e);
      toast?.({ title: 'Failed', description: e?.message || 'Failed to reject dispute', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <UserProvider user={user}>
      <div className="mx-auto container max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Dispute</div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">{dispute ? `#${String(dispute.id).slice(0,8)}` : 'Dispute Details'}</h1>
                <Badge className="capitalize">{dispute?.status || 'N/A'}</Badge>
              </div>
              <div className="text-sm text-gray-500 mt-1">Filed by: <span className="font-medium">{getFiledByName(dispute)}</span>{getFiledByRole(dispute) ? (<Badge className="ml-2 text-xs">{getFiledByRole(dispute)}</Badge>) : null}</div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {/* Only show approve/reject for unresolved disputes */}
              {(!['approved','rejected','resolved'].includes(dispute?.status || '')) && (
                <>
                  <Button size="sm" variant="outline" onClick={handleReject} disabled={actionLoading}>{actionLoading ? 'Working…' : 'Reject'}</Button>
                  <Button size="sm" onClick={handleAccept} disabled={actionLoading}>{actionLoading ? 'Working…' : 'Approve'}</Button>
                </>
              )}
              {(['approved','rejected','resolved'].includes(dispute?.status || '')) && (
                <Badge className="capitalize">{dispute?.status}</Badge>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : error ? (
            <Card>
              <CardHeader>
                <CardTitle>Unable to load dispute</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-600">{error}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dispute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Dispute ID</span><span className="font-medium">{dispute?.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Order ID</span><span className="font-medium">{dispute?.order || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Order Number</span><span className="font-medium">{dispute?.order_number || "N/A"}</span></div>
                  {(() => {
                    const raw = dispute?.refund;
                    const rid = (typeof raw === 'string') ? raw : (raw ? ((raw as any)?.refund_id || (raw as any).id) : null);
                    return <div className="flex justify-between"><span className="text-gray-600">Refund ID</span><span className="font-medium">{rid || "N/A"}</span></div>;
                  })()}
                  <div className="flex justify-between"><span className="text-gray-600">Filed By</span><span className="font-medium">{getFiledByName(dispute)}{getFiledByRole(dispute) ? (<Badge className="ml-2 text-xs">{getFiledByRole(dispute)}</Badge>) : null}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Filed At</span><span className="font-medium">{formatDateTime(dispute?.created_at)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-medium">{dispute?.status || "N/A"}</span></div>
                </CardContent>
              </Card>

              {(!!dispute?.refund || refundLoading || !!refundError) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Refund Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {refundLoading ? (
                      <div className="text-gray-600">Loading refund information…</div>
                    ) : refundError ? (
                      <div className="text-sm text-red-600">{refundError}</div>
                    ) : !refund ? (
                      <div className="text-gray-600">No refund information available.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex justify-between"><span className="text-gray-600">Refund ID</span><span className="font-medium">{refund?.id || refund?.refund || (typeof dispute?.refund === 'string' ? dispute?.refund : (dispute?.refund ? ((dispute as any).refund?.refund_id || (dispute as any).refund?.id) : null)) || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Request #</span><span className="font-medium">{refund.request_number || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Requested At</span><span className="font-medium">{formatDateTime(refund.requested_at || null)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Refund Status</span><span className="font-medium">{refund.status || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Payment Status</span><span className="font-medium">{refund.payment_status || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Refund Method</span><span className="font-medium">{refund.refund_method || "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Total Refund Amount</span><span className="font-medium">{refund.total_refund_amount != null ? String(refund.total_refund_amount) : "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Reason</span><span className="font-medium">{refund.refund_reason || "N/A"}</span></div>
                        {(refund.customer_note || refund.admin_note || refund.admin_response) ? (
                          <div className="md:col-span-2 space-y-2">
                            {refund.customer_note ? (
                              <div>
                                <div className="text-gray-600">Customer Note</div>
                                <div className="whitespace-pre-wrap">{sanitizeCustomerNote(refund.customer_note)}</div>
                              </div>
                            ) : null}
                            {refund.admin_note ? (
                              <div>
                                <div className="text-gray-600">Admin Note</div>
                                <div className="whitespace-pre-wrap">{refund.admin_note}</div>
                              </div>
                            ) : null}
                            {refund.admin_response ? (
                              <div>
                                <div className="text-gray-600">Admin Response</div>
                                <div className="whitespace-pre-wrap">{refund.admin_response}</div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!!refund && (
                <Card>
                  <CardHeader>
                    <CardTitle>Order / Shops / Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex justify-between"><span className="text-gray-600">Order #</span><span className="font-medium">{refund?.order_info?.order_number || dispute?.order_number || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Order ID</span><span className="font-medium">{refund?.order_info?.order_id || dispute?.order || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Total Amount</span><span className="font-medium">{refund?.order_info?.total_amount != null ? String(refund.order_info.total_amount) : "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Payment Method</span><span className="font-medium">{refund?.order_info?.payment_method || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Delivery Address</span><span className="font-medium">{refund?.order_info?.delivery_address_text || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Refund Requested</span><span className="font-medium">{formatDateTime(refund?.requested_at || null)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Refund Status</span><span className="font-medium">{refund?.status || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Refund Request #</span><span className="font-medium">{refund?.request_number || "N/A"}</span></div>
                    </div>

                    {Array.isArray(refund?.shops) && refund.shops.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium">Shops Involved</div>
                        <div className="space-y-2">
                          {refund.shops.map((s, idx) => {
                            const shopId = String(s?.id || "");
                            const extra = shopId ? shopDetails[shopId] : undefined;
                            const owner = extra?.owner;
                            return (
                              <div key={shopId || `${idx}`} className="rounded border p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-medium">{s?.name || extra?.name || "Unknown shop"}</div>
                                    <div className="text-xs text-gray-600">Shop ID: {shopId || "N/A"}</div>
                                  </div>
                                  {owner ? (
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">Owner</div>
                                      <div className="font-medium">{owner.name || "N/A"}</div>
                                      <div className="text-xs text-gray-600">{owner.email || ""}</div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {Array.isArray(refund?.order_items) && refund.order_items.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium">Order Items</div>
                        <div className="space-y-2">
                          {refund.order_items.map((it, idx) => (
                            <div key={it.id || `${idx}`} className="rounded border p-3">
                              <div className="flex justify-between gap-3">
                                <div>
                                  <div className="font-medium">{it.product?.name || "Unknown product"}</div>
                                  <div className="text-xs text-gray-600">Shop: {it.product?.shop?.name || "N/A"}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-600">Qty</div>
                                  <div className="font-medium">{it.quantity ?? "N/A"}</div>
                                  <div className="text-xs text-gray-600">Total</div>
                                  <div className="font-medium">{it.total_amount != null ? String(it.total_amount) : "N/A"}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin action block for approved disputes */}
                    {refund?.status === 'dispute' && dispute?.status === 'approved' && (
                      <div className="mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Dispute Approved — Admin Actions</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div>Dispute approved by: <strong>{(dispute as any)?.processed_by?.username || (dispute as any)?.processed_by?.email || 'Unknown'}</strong></div>
                            <div>Approved at: <strong>{dispute?.resolved_at ? new Date(dispute.resolved_at).toLocaleString() : 'Unknown'}</strong></div>
                            <div className="text-sm text-gray-600">You can apply this decision to the refund to move it to processing.</div>

                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={async () => {
                                try {
                                  setActionLoading(true);
                                  setApplyLoading(true);
                                  const refundId = refund?.refund || refund?.id || (typeof dispute?.refund === 'object' ? (dispute as any).refund?.refund_id || (dispute as any).refund?.id : null);
                                  if (!refundId) throw new Error('Refund id not available');
                                  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
                                  if (safeUserId) headers['X-User-Id'] = String(safeUserId);
                                  const res = await fetch(`${apiBase}/return-refund/${encodeURIComponent(String(refundId))}/admin_update_refund/`, {
                                    method: 'POST',
                                    headers,
                                    credentials: 'include',
                                    body: JSON.stringify({ resolve_dispute: true, dispute_id: dispute?.id, dispute_action: 'approve', dispute_notes: '' })
                                  });
                                  if (!res.ok) {
                                    let msg = `Failed to apply decision (${res.status})`;
                                    try { const j = await res.json(); msg = j?.error || j?.detail || msg; } catch (_) {}
                                    throw new Error(msg);
                                  }
                                  const j = await res.json();
                                  setRefund(j?.refund || refund);
                                  // refresh dispute
                                  const dres = await fetch(`${apiBase}/disputes/${encodeURIComponent(String(dispute?.id))}/`, { headers, credentials: 'include' });
                                  if (dres.ok) {
                                    const djson = await dres.json();
                                    setDispute(djson);
                                  }
                                  toast?.({ title: 'Applied', description: 'Dispute decision applied to refund', variant: 'success' });
                                } catch (e: any) {
                                  console.error('Apply decision failed', e);
                                  toast?.({ title: 'Failed', description: e?.message || 'Failed to apply decision', variant: 'destructive' });
                                } finally {
                                  setActionLoading(false);
                                  setApplyLoading(false);
                                }
                              }} disabled={actionLoading || applyLoading}>{applyLoading ? 'Applying…' : 'Apply Decision'}</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {refund?.delivery ? (
                      <div className="space-y-2">
                        <div className="font-medium">Delivery</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="font-medium">{refund.delivery.status || "N/A"}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Tracking #</span><span className="font-medium">{refund.delivery.tracking_number || "N/A"}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Picked At</span><span className="font-medium">{formatDateTime(refund.delivery.picked_at || null)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Delivered At</span><span className="font-medium">{formatDateTime(refund.delivery.delivered_at || null)}</span></div>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Reason & Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Reason:</span> <span className="font-medium">{dispute?.reason || "N/A"}</span></div>
                  <div className="text-gray-600">Description:</div>
                  <div className="whitespace-pre-wrap">{dispute?.description || "N/A"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dispute Evidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {!dispute?.evidence || dispute.evidence.length === 0 ? (
                    <div className="text-gray-600">No evidence uploaded.</div>
                  ) : (
                    <div className="space-y-2">
                      {dispute.evidence.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between rounded border p-3">
                          <div className="space-y-0.5">
                            <div className="font-medium">{ev.uploaded_by_name || "Unknown uploader"}</div>
                            <div className="text-xs text-gray-600">
                              {ev.created_at ? new Date(ev.created_at).toLocaleString() : ""}
                            </div>
                          </div>
                          {ev.file_url ? (
                            <Button asChild variant="outline" size="sm">
                              <a href={ev.file_url} target="_blank" rel="noreferrer">
                                View
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-600">No file</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
    </UserProvider>
  );
}
