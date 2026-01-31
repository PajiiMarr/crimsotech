"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { 
  Truck, 
  CheckCircle, 
  RotateCcw, 
  MessageCircle, 
  CreditCard,
  Calendar,
  User,
  Package,
  MapPin,
  Phone,
  Clock
} from "lucide-react";

interface ViewDeliveredProps {
  orderDetails: {
    order: {
      id: string;
      status: string;
      status_display: string;
      status_color: string;
      created_at: string;
      updated_at?: string;
      payment_method: string;
      payment_status?: string;
      delivery_status?: string;
      delivery_rider?: string;
      delivery_notes?: string;
      delivery_date?: string;
      completed_at?: string;
      shipping_info?: {
        logistics_carrier?: string;
        tracking_number?: string;
        delivery_method?: string;
        estimated_delivery?: string;
      };
      delivery_address?: {
        recipient_name?: string;
        phone_number?: string;
        address?: string;
        address_details?: {
          street?: string;
          barangay?: string;
          city?: string;
          province?: string;
          postal_code?: string;
        };
      };
      timeline?: Array<{
        event: string;
        date: string;
        description: string;
        icon: string;
      }>;
      summary_counts?: {
        total_items: number;
        total_unique_items: number;
      };
    };
    shipping_info?: any;
    delivery_address?: any;
    items: Array<{
      product_id: string;
      product_name: string;
      product_variant?: string;
      checkout_id?: string;
      quantity: number;
      price: string;
      subtotal: string;
      is_refundable: boolean;
      can_review: boolean;
      can_return: boolean;
      return_deadline?: string;
      product_images?: Array<{ url: string }>;
      primary_image?: { url: string };
      shop_info?: {
        id: string;
        name: string;
        picture?: string;
      };
    }>;
    timeline?: Array<{
      event: string;
      date: string;
      description: string;
      icon: string;
    }>;
  };
  formatCurrency: (amount: number | string) => string;
  formatDate: (dateString: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (dateString: string) => string;
  onRequestRefund: (params: { 
    orderId: string; 
    productId?: string; 
    checkoutId?: string 
  }) => void;
}

export default function ViewDelivered({ 
  orderDetails, 
  formatCurrency, 
  formatDate,
  formatDateTime,
  onRequestRefund 
}: ViewDeliveredProps) {
  const order = orderDetails.order;
  const items = orderDetails.items || [];
  
  // Determine if order is delivered based on status
  const isDelivered = order.status === 'delivered' || order.status === 'completed';
  const isOutForDelivery = order.status === 'shipped' || order.delivery_status === 'out_for_delivery';
  
  // Get delivery date - prioritize delivery_date, then completed_at, then updated_at
  const deliveryDate = order.delivery_date || order.completed_at || order.updated_at;
  
  // Get timeline events
  const timelineEvents = orderDetails.timeline || order.timeline || [];
  
  // Find specific timeline events
  const shippedEvent = timelineEvents.find(ev => ev.event === 'Shipped');
  const deliveredEvent = timelineEvents.find(ev => ev.event === 'Delivered');
  const completedEvent = timelineEvents.find(ev => ev.event === 'Completed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Delivery Information</CardTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${isDelivered ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                >
                  {isDelivered ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <Truck className="h-3 w-3 mr-1" />
                  )}
                  {isDelivered ? 'Delivered' : 'In Transit'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Order #{order.id.substring(0, 8)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Status Alert */}
            <Alert className={isDelivered ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
              <Truck className="h-4 w-4" />
              <AlertTitle>
                {isDelivered ? 'Order Delivered Successfully!' : 'Order is On Its Way'}
              </AlertTitle>
              <AlertDescription>
                {isDelivered 
                  ? 'Your order has been delivered. Thank you for shopping with us!'
                  : 'Your order is currently in transit. Please be available to receive your package.'}
              </AlertDescription>
            </Alert>

            {/* Delivery Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rider Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium">Delivery Personnel</h3>
                </div>
                <div className="pl-6 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Rider Name</p>
                    <p className="font-medium text-sm">
                      {order.delivery_rider || 'Rider information not available'}
                    </p>
                  </div>
                  {order.shipping_info?.logistics_carrier && (
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery Service</p>
                      <p className="font-medium text-sm">{order.shipping_info.logistics_carrier}</p>
                    </div>
                  )}
                  {order.shipping_info?.tracking_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking Number</p>
                      <p className="font-medium text-sm font-mono">{order.shipping_info.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Timeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium">Delivery Timeline</h3>
                </div>
                <div className="pl-6 space-y-2">
                  {order.created_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Order Placed</p>
                      <p className="font-medium text-sm">{formatDateTime(order.created_at)}</p>
                    </div>
                  )}
                  {shippedEvent && (
                    <div>
                      <p className="text-xs text-muted-foreground">Shipped</p>
                      <p className="font-medium text-sm">{formatDateTime(shippedEvent.date)}</p>
                    </div>
                  )}
                  {deliveredEvent && (
                    <div>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="font-medium text-sm">{formatDateTime(deliveredEvent.date)}</p>
                    </div>
                  )}
                  {deliveryDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isDelivered ? 'Delivery Date' : 'Estimated Delivery'}
                      </p>
                      <p className="font-medium text-sm">{formatDateTime(deliveryDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium">Delivery Address</h3>
                </div>
                <div className="pl-6">
                  <div className="space-y-1">
                    {order.delivery_address?.recipient_name && (
                      <p className="font-medium text-sm">{order.delivery_address.recipient_name}</p>
                    )}
                    {order.delivery_address?.phone_number && (
                      <p className="text-xs text-muted-foreground">{order.delivery_address.phone_number}</p>
                    )}
                    {order.delivery_address?.address && (
                      <p className="text-xs">{order.delivery_address.address}</p>
                    )}
                    {order.delivery_address?.address_details && (
                      <div className="text-xs text-muted-foreground">
                        {order.delivery_address.address_details.street && (
                          <p>{order.delivery_address.address_details.street}</p>
                        )}
                        {order.delivery_address.address_details.barangay && order.delivery_address.address_details.city && (
                          <p>{order.delivery_address.address_details.barangay}, {order.delivery_address.address_details.city}</p>
                        )}
                        {order.delivery_address.address_details.province && (
                          <p>{order.delivery_address.address_details.province}</p>
                        )}
                        {order.delivery_address.address_details.postal_code && (
                          <p>{order.delivery_address.address_details.postal_code}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Notes */}
              {order.delivery_notes && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-medium">Delivery Notes</h3>
                  </div>
                  <div className="pl-6">
                    <p className="text-sm">{order.delivery_notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Order Items</h3>
                {order.summary_counts && (
                  <span className="text-xs text-muted-foreground">
                    {order.summary_counts.total_items} items
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {items.map((item, index) => {
                  const imageUrl = item.primary_image?.url || 
                                  (item.product_images && item.product_images[0]?.url) || 
                                  "/phon.jpg";
                                  
                  return (
                    <div 
                      key={`${item.product_id}-${item.checkout_id || index}`} 
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-14 h-14 flex-shrink-0">
                        <img 
                          src={imageUrl} 
                          alt={item.product_name} 
                          className="w-full h-full rounded-md object-cover border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/phon.jpg';
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            {item.product_variant && (
                              <p className="text-xs text-muted-foreground">Variant: {item.product_variant}</p>
                            )}
                            {item.shop_info && (
                              <p className="text-xs text-muted-foreground">
                                Shop: {item.shop_info.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {formatCurrency(item.subtotal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.price)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3">
                            {item.is_refundable && (
                              <Badge variant="outline" className="text-xs bg-orange-50">
                                Refundable
                              </Badge>
                            )}
                            {item.can_return && item.return_deadline && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                Return until {formatDate(item.return_deadline, { month: 'short', day: 'numeric' })}
                              </Badge>
                            )}
                          </div>
                          
                          {item.can_return && item.is_refundable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => onRequestRefund({ 
                                orderId: order.id, 
                                productId: item.product_id,
                                checkoutId: item.checkout_id
                              })}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Request Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Delivery Actions Card */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Contact Seller */}
            {items[0]?.shop_info && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9"
                onClick={() => window.location.href = `/chat/seller/${items[0].shop_info?.id}`}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-2" />
                <div className="text-left">
                  <div className="text-xs font-medium">Contact Seller</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {items[0].shop_info.name}
                  </div>
                </div>
              </Button>
            )}

            {/* Track Order */}
            {order.shipping_info?.tracking_number && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-9"
                onClick={() => window.location.href = `/track-order/${order.id}`}
              >
                <Truck className="h-3.5 w-3.5 mr-2" />
                <div className="text-left">
                  <div className="text-xs font-medium">Track Order</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {order.shipping_info.tracking_number}
                  </div>
                </div>
              </Button>
            )}

            {/* Order Summary */}
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium mb-2">Order Summary</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Date</span>
                  <span>{order.created_at ? formatDate(order.created_at) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span>{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className={order.payment_status === 'completed' ? 'text-green-600' : ''}>
                    {order.payment_status || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Method</span>
                  <span>{order.shipping_info?.delivery_method || 'Standard'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refundable Items */}
        {items.some(item => item.is_refundable) && (
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Refundable Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items
                .filter(item => item.is_refundable)
                .map(item => (
                  <div key={item.product_id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.subtotal)} • {item.quantity} pcs
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onRequestRefund({ 
                        orderId: order.id, 
                        productId: item.product_id,
                        checkoutId: item.checkout_id
                      })}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Refund
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}