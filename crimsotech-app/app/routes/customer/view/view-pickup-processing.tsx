"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Clock, Store, MessageCircle, XCircle } from "lucide-react";

export default function ViewPickupProcessing({ orderDetails, formatCurrency, formatDate, onCancelOrder, onContactSeller }: any) {
  const order = orderDetails.order;
  const shopId = order.items && order.items.length > 0 ? order.items[0].shop_id : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pickup Order</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Preparing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Store className="h-4 w-4" />
              <AlertTitle>Seller is preparing your order</AlertTitle>
              <AlertDescription>
                The seller is preparing your items for pickup. You will be notified when your order is ready for collection at the store.
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

            {/* Pickup instructions */}
            <div className="p-3 bg-gray-50 border rounded">
              <p className="text-sm font-medium">Pickup Instructions</p>
              <p className="text-sm text-gray-600 mt-1">Bring a valid ID and your order number when you come to pick up your items.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" onClick={() => onContactSeller(shopId)}>
              <MessageCircle className="h-3 w-3 mr-1.5" /> Contact Seller
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700" onClick={() => onCancelOrder(order.id)}>
              <XCircle className="h-3 w-3 mr-1.5" /> Cancel Order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
