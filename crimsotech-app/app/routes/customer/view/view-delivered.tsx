  "use client";

  import React, { useState, useEffect } from "react";
  import { Button } from "~/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
  import { Badge } from "~/components/ui/badge";
  import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
  import Breadcrumbs from "~/components/ui/breadcrumbs";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
  import { Truck, CheckCircle, RotateCcw, MessageCircle, CreditCard, Phone, Eye } from "lucide-react";
  import AxiosInstance from '~/components/axios/Axios';

  export default function ViewDelivered({ orderDetails, formatCurrency, formatDate, onRequestRefund, userId }: any) {
    const order = orderDetails.order;
    const [selectedProof, setSelectedProof] = useState<any | null>(null);
    const [fetchedProofs, setFetchedProofs] = useState<any[] | null>(null);
    const [riders, setRiders] = useState<any[] | null>(null);
    const [isFetchingRiders, setIsFetchingRiders] = useState(false);

    // Use backend_status to determine whether this is an actual delivered (arrived) or still out-for-delivery
    const backendStatus = (order.backend_status || '').toString();
    const isDelivered = backendStatus === 'delivered' || backendStatus === 'completed';

    // Prefer server-fetched proofs when available
    const defaultProofs = order.delivery_proofs || (order.delivery_evidence || []).map((url: string) => ({ file_url: url }));
    const proofs = fetchedProofs !== null ? fetchedProofs : defaultProofs;

    // Debug: log proofs to DevTools to verify data availability
    console.debug('ViewDelivered defaultProofs:', defaultProofs, 'fetchedProofs:', fetchedProofs);

    useEffect(() => {
      let cancelled = false;
      if (!isDelivered || !order?.id) return;

      const fetchProofs = async () => {
        try {
          // Fallback: ask proof-management for proofs by order id (single reliable endpoint)
          const res2 = await AxiosInstance.get(`/proof-management/get_delivery_proofs_by_order/?order_id=${order.id}`, {
            headers: { 'X-User-Id': userId || '' }
          });
          if (res2.data && res2.data.success) {
            const proofsData2 = res2.data.proofs || res2.data.all_proofs || [];
            const mapped2 = proofsData2.map((p: any) => ({ file_url: p.file_url, file_name: p.file_name, uploaded_at: p.uploaded_at, file_type: p.file_type }));
            console.debug('Fetched delivery proofs (proof-management):', mapped2);
            setFetchedProofs(mapped2);
            return;
          }

          console.debug('No proofs from proof-management for order', order.id);

          if (cancelled) return;

          setFetchedProofs([]);
        } catch (err) {
          console.error('Error fetching delivery proofs:', err);
          setFetchedProofs([]);
        }
      };

      fetchProofs();

      return () => { cancelled = true; };
    }, [order?.id, isDelivered, userId]);

    // Fetch rider info for this order (customer-facing endpoint)
    useEffect(() => {
      let cancelled = false;
      if (!order?.id) return;

      const fetchRiders = async () => {
        setIsFetchingRiders(true);
        try {
          const res = await AxiosInstance.get(`/purchases-buyer/${order.id}/get-rider-info/`, { headers: { 'X-User-Id': userId || '' } });
          if (cancelled) return;

          if (res.data && res.data.success) {
            console.debug('Fetched rider info:', res.data.riders);
            setRiders(res.data.riders || []);
          } else {
            console.debug('No rider info returned', res.data);
            setRiders([]);
          }
        } catch (err) {
          console.error('Error fetching rider info:', err);
          setRiders([]);
        } finally {
          setIsFetchingRiders(false);
        }
      };

      fetchRiders();
      return () => { cancelled = true; };
    }, [order?.id, userId]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Delivered Order</CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  <Truck className="h-3 w-3 mr-1" />
                  {isDelivered ? 'Delivered' : 'In Transit'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className={isDelivered ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
                <Truck className="h-4 w-4" />
                <AlertTitle>{isDelivered ? 'Order Delivered' : 'Out for Delivery'}</AlertTitle>
                <AlertDescription>
                  {isDelivered ? 'Your order has been delivered. Thank you for shopping with us.' : 'Your order is on its way. Please be available to receive.'}
                </AlertDescription>
              </Alert>

              {/* Delivery Info (Delivered At, Rider, Evidence) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Status</p>
                  <p className="font-medium text-sm">{isDelivered ? 'Delivered' : 'Out for Delivery'}</p>

                  {isDelivered && (
                    <>
                      <p className="text-xs text-muted-foreground mt-3">Delivered At</p>
                      <p className="font-medium text-sm">{(order.delivered_at || order.completed_at || order.updated_at) ? formatDate(order.delivered_at || order.completed_at || order.updated_at) : 'N/A'}</p>
                    </>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Rider</p>

                  {/* Show fetched riders when available, else fallback to order fields */}
                  {isFetchingRiders ? (
                    <p className="text-xs text-muted-foreground">Loading rider info...</p>
                  ) : (riders && riders.length > 0) ? (
                    <div className="space-y-2">
                      {riders.map((r: any, idx: number) => {
                        const user = r.user || r;
                        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Rider';
                        const phone = user.phone || r.phone || '';
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{name}</p>
                              {phone ? (
                                <a href={`tel:${phone}`} className="text-xs text-muted-foreground flex items-center gap-2">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{phone}</span>
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">No phone</p>
                              )}
                            </div>

                            {phone && (
                              <a href={`tel:${phone}`} className="text-xs underline">Call</a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm">{order.rider_name || 'N/A'}</p>
                      {order.rider_contact ? (
                        <a href={`tel:${order.rider_contact}`} className="text-xs text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{order.rider_contact}</span>
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">N/A</p>
                      )}
                    </>
                  )}

                  {/* Proof thumbnails */}
                  {isDelivered && (
                    <>
                      <p className="text-xs text-muted-foreground mt-3">Delivery Evidence</p>

                      {proofs && proofs.length > 0 ? (
                        <div className="flex gap-2 mt-2">
                          {proofs.map((p: any, idx: number) => (
                            <button key={idx} onClick={() => setSelectedProof(p)} className="w-16 h-12 rounded overflow-hidden border bg-gray-100 focus:outline-none">
                              <img src={p.file_url} alt={p.file_name || `proof-${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mt-2 italic">No delivery evidence available</p>
                          <p className="text-xs text-muted-foreground mt-1">Attempting to fetch latest evidence...</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Order Items</p>
                <div className="space-y-2">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-12 h-12">
                        <img src={item.image_url || "/phon.jpg"} alt={item.name} className="rounded" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>

                      {/* Per-item actions (Refund if refundable) */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-medium text-sm">{formatCurrency(item.subtotal)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Delivery Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Per-order refund (keeps existing behavior) */}
              {(order.can_request_refund ?? order.items.some((item: any) => item.is_refundable)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => onRequestRefund({ orderId: order.id })}
                >
                  <CreditCard className="h-3 w-3 mr-1.5" />
                  Request Refund (Order)
                </Button>
              )}

              {/* Item-level refunds shown in Delivery Actions */}
              {order.items && order.items.some((i: any) => i.is_refundable) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Refundable Items</p>
                  {order.items.filter((i: any) => i.is_refundable).map((it: any) => (
                    <div key={it.checkout_id || it.product_id} className="flex flex-col gap-2 w-full">
                      <div className="text-xs truncate">{it.product_name}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() => onRequestRefund({ orderId: order.id, productId: it.product_id, checkoutId: it.checkout_id })}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        <span className="text-xs">Refund</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs">
                <MessageCircle className="h-3 w-3 mr-1.5" />
                Contact Seller
              </Button>
              
            </CardContent>
          </Card>
        </div>

        {/* Proof Preview Dialog */}
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedProof?.file_name || 'Delivery Evidence'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedProof && selectedProof.file_url ? (
                <img src={selectedProof.file_url} alt={selectedProof.file_name} className="w-full max-h-[60vh] object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <Eye className="h-6 w-6 text-gray-400" />
                  <p className="mt-4 text-sm">No preview available</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Uploaded</div>
                <div className="font-medium">{selectedProof?.uploaded_at ? formatDate(selectedProof.uploaded_at) : 'Unknown'}</div>
              </div>
              <div>
                {selectedProof?.file_url && (
                  <a href={selectedProof.file_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Open file in new tab</a>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }