"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { CheckCircle, Store, MessageCircle } from "lucide-react";

export default function ViewPickupPickedUp({ orderDetails, formatCurrency, formatDate, onContactSeller, onComplete }: any) {
  const order = orderDetails.order;
  const [loading, setLoading] = useState(false);
  const shopId = order.items && order.items.length > 0 ? order.items[0].shop_id : null;

  const handleComplete = async () => {
    if (!onComplete) return;
    try {
      setLoading(true);
      await onComplete(order.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Order Picked Up</CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Picked Up
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Store className="h-4 w-4" />
              <AlertTitle>Your order has been picked up</AlertTitle>
              <AlertDescription>
                We detected that your order was picked up. If you have received all items in good condition, please mark the order as complete.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Pickup Method</p>
                <p className="font-medium text-sm">{order.shipping?.method || "Pickup from Store"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="font-medium text-sm">{order.items.length} items</p>
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
                    <div className="font-medium text-sm">{formatCurrency(item.subtotal)}</div>
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
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => onContactSeller(shopId)}>
              <MessageCircle className="h-3 w-3 mr-1.5" /> Contact Seller
            </Button>
            <Button variant="default" size="sm" className="w-full justify-start h-8 text-xs" onClick={handleComplete} disabled={loading}>
              <CheckCircle className="h-3 w-3 mr-1.5" /> {loading ? 'Completing...' : 'Complete'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
