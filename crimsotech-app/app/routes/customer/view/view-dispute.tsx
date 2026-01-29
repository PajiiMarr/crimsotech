"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ShieldAlert, MessageCircle, FileText, AlertTriangle } from "lucide-react";

export default function ViewDispute({ orderDetails, formatCurrency, formatDate, onViewDisputeDetails }: any) {
  const order = orderDetails.order;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dispute Case</CardTitle>
              <Badge variant="outline" className="bg-red-100 text-red-800">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Dispute
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Dispute in Progress</AlertTitle>
              <AlertDescription>
                Your dispute case is under investigation by our support team.
              </AlertDescription>
            </Alert>

            {/* Dispute Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Case ID</p>
                <p className="font-medium text-sm">DSP-{order.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium text-sm">Under Investigation</p>
              </div>
            </div>

            {/* Dispute Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Disputed Items</p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="w-12 h-12">
                      <img src={item.image_url || "/phon.jpg"} alt={item.name} className="rounded" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-xs text-red-600">Amount: ₱{item.subtotal}</p>
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
            <CardTitle className="text-sm">Dispute Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => onViewDisputeDetails(order.id)}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              Case Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Moderator
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              disabled
            >
              <ShieldAlert className="h-3 w-3 mr-1.5" />
              Upload Evidence
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}