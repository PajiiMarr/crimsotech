"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Package, Truck, MessageCircle } from "lucide-react";

export default function ViewShipping({ orderDetails, formatCurrency, formatDate, onTrackOrder }: any) {
  const order = orderDetails.order;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ready to Ship</CardTitle>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                <Package className="h-3 w-3 mr-1" />
                To Ship
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-indigo-50 border-indigo-200">
              <Package className="h-4 w-4" />
              <AlertTitle>Ready for Shipping</AlertTitle>
              <AlertDescription>
                Your order is packed and waiting for carrier pickup.
              </AlertDescription>
            </Alert>

            {/* Shipping Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Shipping Method</p>
                <p className="font-medium text-sm">{order.shipping.method}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                <p className="font-medium text-sm">3-5 business days</p>
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
            <CardTitle className="text-sm">Shipping Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onTrackOrder(order.id)}
            >
              <Truck className="h-3 w-3 mr-1.5" />
              Track Order
            </Button>
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