"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { MessageSquare, Star, CheckCircle, RotateCcw } from "lucide-react";

export default function ViewRatings({ orderDetails, formatCurrency, formatDate, onRateProduct }: any) {
  const order = orderDetails.order;
  const itemsToRate = order.items.filter((item: any) => item.can_review !== false);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Rate Your Purchase</CardTitle>
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                <MessageSquare className="h-3 w-3 mr-1" />
                Rate Now
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <Star className="h-4 w-4" />
              <AlertTitle>Share Your Experience</AlertTitle>
              <AlertDescription>
                Rate your purchased items to help other buyers.
              </AlertDescription>
            </Alert>

            {/* Items to Rate */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Items to Rate ({itemsToRate.length})</p>
              <div className="space-y-2">
                {itemsToRate.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className="w-12 h-12">
                      <img src={item.image_url || "/phon.jpg"} alt={item.name} className="rounded" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => onRateProduct(item.product_id)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Rate
                    </Button>
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
            <CardTitle className="text-sm">Rating Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              Your ratings help other buyers make better decisions.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Ratings are anonymous</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Can be edited later</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Help sellers improve</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => {
                // Rate all items
                itemsToRate.forEach((item: any) => onRateProduct(item.product_id));
              }}
            >
              <Star className="h-3 w-3 mr-1.5" />
              Rate All Items
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}