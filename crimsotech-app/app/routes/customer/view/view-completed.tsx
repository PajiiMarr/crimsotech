"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { CheckCircle, Star, RotateCcw, ShoppingBag } from "lucide-react";

export default function ViewCompleted({ 
  orderDetails, 
  formatCurrency, 
  formatDate, 
  onReorder,
  onRateProduct,
  onRequestRefund
}: any) {
  const order = orderDetails.order;
  const paymentMethod = (order.payment?.method || order.payment_method || '').toString().toLowerCase();
  const deliveryMethod = (order.shipping?.method || order.delivery_method || '').toString().toLowerCase();
  const isPickupCash = paymentMethod.includes('cash on pickup') && deliveryMethod.includes('pickup');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Order Completed</CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Order Successfully Completed</AlertTitle>
              <AlertDescription>
                Thank you for your purchase! Your order has been completed.
              </AlertDescription>
            </Alert>

            {/* Order Summary */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Order Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed On</p>
                  <p className="font-medium text-sm">{formatDate(order.updated_at)}</p>
                </div>
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
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(item.subtotal)}</div>
                      {item.can_review && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs mt-1"
                          onClick={() => onRateProduct(item.product_id)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Rate
                        </Button>
                      )}
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
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onReorder(order.id)}
            >
              <ShoppingBag className="h-3 w-3 mr-1.5" />
              Buy Again
            </Button>
            

            {/* Only show refund if within return period */}
            {order.items.some((item: any) => item.is_refundable) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs text-red-600"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Report Issue
              </Button>
            )}

            {/* For completed pickup + cash orders, show a Request Refund button */}
            {isPickupCash && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-orange-600"
                onClick={() => onRequestRefund && onRequestRefund(order.id)}
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Request Refund
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}