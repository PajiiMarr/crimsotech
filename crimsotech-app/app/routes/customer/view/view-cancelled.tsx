"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { XCircle, RotateCcw, MessageCircle, ShoppingBag } from "lucide-react";

export default function ViewCancelled({ orderDetails, formatCurrency, formatDate, onReorder, onContactSupport }: any) {
  const order = orderDetails.order;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Cancelled Order</CardTitle>
              <Badge variant="outline" className="bg-red-100 text-red-800">
                <XCircle className="h-3 w-3 mr-1" />
                Cancelled
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Order Cancelled</AlertTitle>
              <AlertDescription>
                This order has been cancelled. Refund will be processed within 7-14 business days.
              </AlertDescription>
            </Alert>

            {/* Cancellation Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Cancelled On</p>
                <p className="font-medium text-sm">{formatDate(order.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Refund Status</p>
                <p className="font-medium text-sm">Processing</p>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Cancelled Items</p>
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
            <CardTitle className="text-sm">Cancellation Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onReorder(order.id)}
            >
              <ShoppingBag className="h-3 w-3 mr-1.5" />
              Reorder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onContactSupport(order.id)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}