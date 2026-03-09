"use client";

import React, { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import Breadcrumbs from "~/components/ui/breadcrumbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { 
  Truck, 
  CheckCircle, 
  RotateCcw, 
  MessageCircle, 
  CreditCard, 
  Phone, 
  Eye,
  Clock,
  Award,
  Camera
} from "lucide-react";
import AxiosInstance from '~/components/axios/Axios';

// Helper function to get full image URL with debug logging
const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/phon.jpg";
  return url;
};

export default function ViewDelivered({ orderDetails, formatCurrency, formatDate, onRequestRefund, userId }: any) {
  // Debug: Log the entire orderDetails prop
  console.log('ViewDelivered - orderDetails prop:', orderDetails);
  
  const order = orderDetails.order;
  console.log('ViewDelivered - order object:', order);
  console.log('ViewDelivered - order.items:', order?.items);
  
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [fetchedProofs, setFetchedProofs] = useState<any[] | null>(null);
  const [riders, setRiders] = useState<any[] | null>(null);
  const [isFetchingRiders, setIsFetchingRiders] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState(order.status);
  const [loadingProofs, setLoadingProofs] = useState(false);

  // Use backend_status to determine whether this is an actual delivered (arrived) or still out-for-delivery
  const backendStatus = (order.backend_status || '').toString();
  const isDelivered = backendStatus === 'delivered' || backendStatus === 'completed' || orderStatus === 'delivered';
  const isCompleted = orderStatus === 'completed';

  // Calculate days since delivery
  const getDaysSinceDelivery = () => {
    if (!order.delivered_at && !order.completed_at && !order.updated_at) return null;
    
    const deliveryDate = new Date(order.delivered_at || order.completed_at || order.updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deliveryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSinceDelivery = getDaysSinceDelivery();
  const autoCompleteDays = 7;
  const daysRemaining = autoCompleteDays - (daysSinceDelivery || 0);
  const canComplete = isDelivered && !isCompleted && daysSinceDelivery !== null && daysSinceDelivery <= autoCompleteDays;

  // Fetch proofs from rider-proof endpoint
  const fetchDeliveryProofs = async () => {
    if (!order?.id) return;
    
    setLoadingProofs(true);
    try {
      console.log('Fetching proofs for order:', order.id);
      
      const response = await AxiosInstance.get(
        `/proof-management/get_delivery_proofs_by_order/?order_id=${order.id}`,
        {
          headers: { 'X-User-Id': userId || '' }
        }
      );
      
      console.log('Proofs response:', response.data);
      
      if (response.data && response.data.success) {
        const proofs = response.data.proofs || response.data.all_proofs || [];
        console.log('Proofs found:', proofs);
        setFetchedProofs(proofs);
      } else {
        console.log('No proofs found in response');
        setFetchedProofs([]);
      }
    } catch (error) {
      console.error('Error fetching delivery proofs:', error);
      setFetchedProofs([]);
    } finally {
      setLoadingProofs(false);
    }
  };

  // Fetch proofs when component mounts
  useEffect(() => {
    if (isDelivered && order?.id) {
      fetchDeliveryProofs();
    }
  }, [order?.id, isDelivered]);

  // Fetch rider info for this order (customer-facing endpoint)
  useEffect(() => {
    let cancelled = false;
    if (!order?.id) return;

    const fetchRiders = async () => {
      setIsFetchingRiders(true);
      try {
        const res = await AxiosInstance.get(`/purchases-buyer/${order.id}/get-rider-info/`, { headers: { 'X-User-Id': userId || '' } });
        if (cancelled) return;

        if (res.data && res.data.success) {
          console.debug('Fetched rider info:', res.data.riders);
          setRiders(res.data.riders || []);
        } else {
          console.debug('No rider info returned', res.data);
          setRiders([]);
        }
      } catch (err) {
        console.error('Error fetching rider info:', err);
        setRiders([]);
      } finally {
        setIsFetchingRiders(false);
      }
    };
    
    fetchRiders();
    return () => { cancelled = true; };
  }, [order?.id, userId]);

  // Handle mark as completed
  const handleMarkAsCompleted = async () => {
    if (!order?.id) return;
    
    setIsCompleting(true);
    setCompletionMessage(null);
    
    try {
      const response = await AxiosInstance.patch(
        `/purchases-buyer/${order.id}/complete/`,
        {},
        {
          headers: {
            'X-User-Id': userId || ''
          }
        }
      );
      
      if (response.data && response.data.success) {
        setOrderStatus('completed');
        setCompletionMessage('Order marked as completed successfully!');
        
        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setCompletionMessage(response.data?.message || 'Failed to mark order as completed');
      }
    } catch (error: any) {
      console.error('Error marking order as completed:', error);
      setCompletionMessage(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {isCompleted ? 'Completed Order' : 'Delivered Order'}
              </CardTitle>
              <Badge variant="outline" className={isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                {isCompleted ? (
                  <Award className="h-3 w-3 mr-1" />
                ) : (
                  <Truck className="h-3 w-3 mr-1" />
                )}
                {isCompleted ? 'Completed' : 'Delivered'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}>
              {isCompleted ? (
                <Award className="h-4 w-4" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              <AlertTitle>{isCompleted ? 'Order Completed' : 'Order Delivered'}</AlertTitle>
              <AlertDescription>
                {isCompleted 
                  ? 'You have marked this order as completed. Thank you for shopping with us.' 
                  : 'Your order has been delivered. Please confirm receipt by marking it as completed.'}
              </AlertDescription>
            </Alert>

            {/* Delivery Info (Delivered At, Rider, Evidence) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Delivery Status</p>
                <p className="font-medium text-sm">{isCompleted ? 'Completed' : 'Delivered'}</p>

                {isDelivered && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3">Delivered At</p>
                    <p className="font-medium text-sm">{(order.delivered_at || order.completed_at || order.updated_at) ? formatDate(order.delivered_at || order.completed_at || order.updated_at) : 'N/A'}</p>
                  </>
                )}

                {isCompleted && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3">Completed At</p>
                    <p className="font-medium text-sm">{order.completed_at ? formatDate(order.completed_at) : formatDate(new Date().toISOString())}</p>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Rider</p>

                {/* Show fetched riders when available, else fallback to order fields */}
                {isFetchingRiders ? (
                  <p className="text-xs text-muted-foreground">Loading rider info...</p>
                ) : (riders && riders.length > 0) ? (
                  <div className="space-y-2">
                    {riders.map((r: any, idx: number) => {
                      const user = r.user || r;
                      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Rider';
                      const phone = user.phone || r.phone || '';
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{name}</p>
                            {phone ? (
                              <a href={`tel:${phone}`} className="text-xs text-muted-foreground flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span className="truncate">{phone}</span>
                              </a>
                            ) : (
                              <p className="text-xs text-muted-foreground">No phone</p>
                            )}
                          </div>

                          {phone && (
                            <a href={`tel:${phone}`} className="text-xs underline">Call</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-sm">{order.rider_name || 'N/A'}</p>
                    {order.rider_contact ? (
                      <a href={`tel:${order.rider_contact}`} className="text-xs text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">{order.rider_contact}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">N/A</p>
                    )}
                  </>
                )}

                {/* Proof thumbnails */}
                {isDelivered && (
                  <>
                    <div className="flex items-center justify-between mt-3 mb-1">
                      <p className="text-xs text-muted-foreground">Delivery Evidence</p>
                      {loadingProofs && (
                        <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
                      )}
                    </div>

                    {fetchedProofs && fetchedProofs.length > 0 ? (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {fetchedProofs.map((p: any, idx: number) => (
                          <button 
                            key={p.id || idx} 
                            onClick={() => setSelectedProof(p)} 
                            className="w-16 h-12 rounded overflow-hidden border bg-gray-100 focus:outline-none hover:opacity-80 transition-opacity"
                          >
                            <img 
                              src={p.file_url} 
                              alt={p.file_name || `proof-${idx}`} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('Proof image failed to load:', p.file_url);
                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    ) : !loadingProofs ? (
                      <p className="text-xs text-muted-foreground mt-2 italic">No delivery evidence available</p>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Order Items</p>
              <div className="space-y-2">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => {
                    // Debug each item
                    console.log(`Rendering item ${index}:`, item);
                    console.log(`Item ${index} image_url:`, item.image_url);
                    console.log(`Item ${index} primary_image:`, item.primary_image);
                    console.log(`Item ${index} product_images:`, item.product_images);
                    
                    // Get the image URL - try multiple possible locations
                    const rawImageUrl = item.image_url || 
                                       item.primary_image?.url || 
                                       (item.product_images && item.product_images[0]?.url);
                    
                    console.log(`Item ${index} rawImageUrl:`, rawImageUrl);
                    
                    // Use the helper to ensure full URL
                    const imageUrl = getFullImageUrl(rawImageUrl);
                    
                    console.log(`Item ${index} final image URL:`, imageUrl);
                    
                    return (
                      <div key={item.id || index} className="flex items-center gap-3 p-2 border rounded">
                        <div className="w-12 h-12 flex-shrink-0">
                          <img 
                            src={imageUrl} 
                            alt={item.name || 'Product'} 
                            className="w-full h-full rounded object-cover"
                            onError={(e) => {
                              console.log(`Item ${index} image failed to load:`, imageUrl);
                              (e.target as HTMLImageElement).src = '/phon.jpg';
                            }}
                            onLoad={() => console.log(`Item ${index} image loaded successfully:`, imageUrl)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name || 'Unknown Product'}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity || 0}</p>
                          {item.variant && (
                            <p className="text-xs text-gray-400 truncate">{item.variant}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="font-medium text-sm">{formatCurrency(item.subtotal || 0)}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">No items found</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Success/Error Message */}
            {completionMessage && (
              <div className={`text-xs p-2 rounded ${completionMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {completionMessage}
              </div>
            )}

            {/* Already Completed Badge */}
            {isCompleted && (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Order Completed</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Thank you for confirming receipt of your order.
                </p>
              </div>
            )}

            {/* Mark as Completed Button */}
            {isDelivered && !isCompleted && canComplete && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                onClick={handleMarkAsCompleted}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <>
                    <Clock className="h-3 w-3 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    Mark as Completed
                  </>
                )}
              </Button>
            )}

            {/* View All Proofs Button */}
            {isDelivered && fetchedProofs && fetchedProofs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => setSelectedProof(fetchedProofs[0])}
              >
                <Camera className="h-3 w-3 mr-1.5" />
                View All Proofs ({fetchedProofs.length})
              </Button>
            )}

            {/* Item-level refunds */}
            {order.items && order.items.some((i: any) => i.is_refundable) && !isCompleted && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Refundable Items</p>
                {order.items.filter((i: any) => i.is_refundable).map((it: any) => (
                  <div key={it.checkout_id || it.product_id} className="flex flex-col gap-2 w-full">
                    <div className="text-xs truncate">{it.product_name}</div>
<Button
  variant="outline"
  size="sm"
  className="w-full justify-start h-8 text-xs"
  onClick={() => {
    // Debug log to see what we're working with
    console.log('Refund button clicked - order object:', order);
    console.log('Item being refunded:', it);
    
    // Get the order ID - try multiple possible locations
    let orderId = order?.id || order?.order_id || order?.orderId;
    
    // If orderId is an object, try to extract the ID
    if (orderId && typeof orderId === 'object') {
      console.log('orderId is an object:', orderId);
      orderId = orderId.id || orderId.order_id || orderId.orderId || JSON.stringify(orderId);
    }
    
    // Convert to string and clean it
    const cleanOrderId = String(orderId || '').replace(/\.data$/, '');
    
    console.log('Clean order ID:', cleanOrderId);
    console.log('Product ID:', it.product_id);
    console.log('Checkout ID:', it.checkout_id);
    
    if (!cleanOrderId) {
      console.error('No valid order ID found');
      return;
    }
    
    onRequestRefund({ 
      orderId: cleanOrderId, 
      productId: it.product_id, 
      checkoutId: it.checkout_id 
    });
  }}
>
  <CreditCard className="h-3 w-3 mr-1" />
  <span className="text-xs">Refund</span>
</Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs">
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            
          </CardContent>
        </Card>
      </div>

      {/* Proof Preview Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedProof?.file_name || 'Delivery Evidence'}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedProof && selectedProof.file_url ? (
              <img 
                src={selectedProof.file_url} 
                alt={selectedProof.file_name} 
                className="w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  console.log('Proof preview failed to load:', selectedProof.file_url);
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48">
                <Eye className="h-6 w-6 text-gray-400" />
                <p className="mt-4 text-sm">No preview available</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Uploaded</div>
              <div className="font-medium">{selectedProof?.uploaded_at ? formatDate(selectedProof.uploaded_at) : 'Unknown'}</div>
            </div>
            <div className="flex gap-2">
              {selectedProof?.file_url && (
                <>
                  <a href={selectedProof.file_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                    Open in new tab
                  </a>
                  {fetchedProofs && fetchedProofs.length > 1 && (
                    <span className="text-sm text-gray-400">
                      {fetchedProofs.findIndex((p: any) => p.id === selectedProof.id) + 1}/{fetchedProofs.length}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}