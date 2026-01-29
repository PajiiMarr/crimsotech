"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Clock, Package, MessageCircle, XCircle } from "lucide-react";

export default function ViewProcessing({ orderDetails, formatCurrency, formatDate, onCancelOrder }: any) {
  const order = orderDetails.order;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Processing Order</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Processing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4" />
              <AlertTitle>Order Confirmed</AlertTitle>
              <AlertDescription>
                Seller is preparing your order for shipping.
              </AlertDescription>
            </Alert>

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
            <CardTitle className="text-sm">Processing Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700"
              onClick={() => onCancelOrder(order.id)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Cancel Order
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