"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Truck, CheckCircle, RotateCcw, MessageCircle, CreditCard } from "lucide-react";



export default function ViewDelivered({ orderDetails, formatCurrency, formatDate, onRequestRefund }: any) {
  const order = orderDetails.order;
  // Use backend_status to determine whether this is an actual delivered (arrived) or still out-for-delivery
  const backendStatus = (order.backend_status || '').toString();
  const isDelivered = backendStatus === 'delivered' || backendStatus === 'completed';
  
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
                    <p className="font-medium text-sm">{order.delivered_at ? formatDate(order.delivered_at) : 'N/A'}</p>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Rider</p>
                <p className="font-medium text-sm">{order.rider_name || 'N/A'}</p>
                {order.rider_contact && <p className="text-xs text-muted-foreground">{order.rider_contact}</p>}

                {order.delivery_evidence && order.delivery_evidence.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3">Delivery Evidence</p>
                    <div className="flex gap-2 mt-2">
                      {order.delivery_evidence.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt={`evidence-${idx}`} className="w-16 h-12 object-cover rounded" />
                      ))}
                    </div>
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
    </div>
  );
}