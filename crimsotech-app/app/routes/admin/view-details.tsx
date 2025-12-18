import type { Route } from "./+types/view-details";
import { data } from "react-router";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");
  const { userContext } = await import("~/contexts/user-role");

  let user = (context as any).get(userContext);
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

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [refund, setRefund] = useState<RefundDetails | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState<Record<string, ShopDetails>>({});
  const [error, setError] = useState<string | null>(null);

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

        if (!res.ok) {
          throw new Error(`Failed to load dispute (${res.status})`);
        }

        const data = await res.json();
        setDispute(data);

        const refundId = data?.refund;
        if (refundId) {
          setRefundLoading(true);
          setRefundError(null);
          const refundRes = await fetch(
            `${apiBase}/return-refund/${encodeURIComponent(refundId)}/get_my_refund/`,
            {
              method: "GET",
              headers,
              credentials: "include",
            },
          );

          if (!refundRes.ok) {
            setRefund(null);
            setRefundError(`Failed to load refund details (${refundRes.status})`);
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

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
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
                  <div className="flex justify-between"><span className="text-gray-600">Refund ID</span><span className="font-medium">{dispute?.refund || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Filed By</span><span className="font-medium">{dispute?.filed_by_name || dispute?.filed_by || "Unknown"}</span></div>
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
                        <div className="flex justify-between"><span className="text-gray-600">Refund ID</span><span className="font-medium">{refund.id || dispute?.refund || "N/A"}</span></div>
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
                                <div className="whitespace-pre-wrap">{refund.customer_note}</div>
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
      </SidebarLayout>
    </UserProvider>
  );
}
