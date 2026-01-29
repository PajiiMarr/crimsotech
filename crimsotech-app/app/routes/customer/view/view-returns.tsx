"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { RotateCcw, Clock, MessageCircle, FileText } from "lucide-react";

export default function ViewReturns({ orderDetails, formatCurrency, formatDate, onViewRefundDetails }: any) {
  const order = orderDetails.order;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Return/Refund Request</CardTitle>
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                <RotateCcw className="h-3 w-3 mr-1" />
                Return/Refund
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-orange-50 border-orange-200">
              <RotateCcw className="h-4 w-4" />
              <AlertTitle>Return/Refund Requested</AlertTitle>
              <AlertDescription>
                Your request is being processed. We'll update you soon.
              </AlertDescription>
            </Alert>

            {/* Return Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Request Date</p>
                <p className="font-medium text-sm">{formatDate(order.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium text-sm">Under Review</p>
              </div>
            </div>

            {/* Return Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Return Items</p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="w-12 h-12">
                      <img src={item.image_url || "/phon.jpg"} alt={item.name} className="rounded" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-xs text-blue-600">Refund: ₱{item.subtotal}</p>
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
            <CardTitle className="text-sm">Return Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onViewRefundDetails(order.id)}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              disabled
            >
              <Clock className="h-3 w-3 mr-1.5" />
              Track Return
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}