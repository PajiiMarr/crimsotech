"use client";

import { useNavigate } from 'react-router';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import Breadcrumbs from '~/components/ui/breadcrumbs';
import { ArrowLeft, CheckCircle, Download, MessageCircle, Star, Package, Calendar, Clock } from "lucide-react";

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- Main Component ---
export default function ViewCompletedOrder() {
  const navigate = useNavigate();
  
  // Completed order data
  const orderData = {
    orderId: "TXNID983274",
    trackingNumber: "34u2394y239y",
    orderDate: "2020-11-20",
    completedDate: "2020-11-26",
    status: "completed",
    sellerName: "Double CTRL Z",
    buyerName: "Rucas Royal",
    
    items: [
      {
        id: 1,
        name: "Sneakers INVERNI BW",
        brand: "Sneakers",
        variant: "Black | Size: 44",
        quantity: 1,
        price: 449000,
        image: "/public/phon.jpg",
        rating: 5,
        review: "Great quality sneakers! Very comfortable and true to size.",
        reviewDate: "2020-11-28"
      },
      {
        id: 2,
        name: "Jacket PISSED",
        brand: "Catalystwist",
        variant: "Black | Size: XL",
        quantity: 1,
        price: 439000,
        image: "/public/power_supply.jpg",
        rating: 4,
        review: "Good jacket, but runs a bit small. Material is excellent.",
        reviewDate: "2020-11-27"
      },
    ],

    addresses: {
      seller: `Double CTRL Z\n1234 Market Street, Apt 56\nPhiladelphia, PA 19107\nUSA`,
      buyer: `Rucas Royal\n4567 Elm Street, Apt 3B\nPhiladelphia, PA 19104\nUSA, Near University City`,
      delivery: `4567 Elm Street, Apt 3B\nPhiladelphia, PA 19104\nUSA`
    },

    summary: {
      productTotal: 350.00,
      shippingDiscount: 80,
      platformFee: 0.015,
      shippingFee: 30,
      totalPaid: 896500,
      paymentMethod: "Cash On Delivery (COD)",
      paymentStatus: "Paid",
    },

    shippingInfo: {
      courier: "LBC Express",
      estimatedDelivery: "2020-11-25",
      actualDelivery: "2020-11-26 15:30",
      deliveryProof: "/public/delivery-proof.jpg",
      weight: "2.5 kg",
      dimensions: "30 x 20 x 15 cm"
    },

    timeline: [
      {
        date: "2020-11-20 10:00",
        status: "Order Confirmed",
        description: "Order confirmed by seller",
        icon: "check"
      },
      {
        date: "2020-11-21 09:15",
        status: "Processing",
        description: "Seller preparing your items",
        icon: "package"
      },
      {
        date: "2020-11-23 08:00",
        status: "Shipped",
        description: "Package handed over to LBC Express",
        icon: "truck"
      },
      {
        date: "2020-11-24 14:30",
        status: "In Transit",
        description: "Arrived at Philadelphia Hub",
        icon: "plane"
      },
      {
        date: "2020-11-25 09:15",
        status: "Out for Delivery",
        description: "With courier for final delivery",
        icon: "delivery"
      },
      {
        date: "2020-11-26 15:30",
        status: "Delivered",
        description: "Successfully delivered to recipient",
        icon: "check-circle",
        highlight: true
      }
    ]
  };

  // Reusable components
  const StatusBadge = () => (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-1.5">
      <CheckCircle className="w-4 h-4 mr-2" />
      Order Completed
    </Badge>
  );

  const TimelineItem = ({ event }: { event: typeof orderData.timeline[0] }) => (
    <div className="flex items-start space-x-4 py-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        event.highlight ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {event.icon === 'check-circle' && <CheckCircle className="w-4 h-4" />}
        {event.icon === 'package' && <Package className="w-4 h-4" />}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-sm">{event.status}</p>
            <p className="text-sm text-gray-600">{event.description}</p>
          </div>
          <p className="text-xs text-gray-500">{formatDateTime(event.date)}</p>
        </div>
      </div>
    </div>
  );

  const ReviewCard = ({ item }: { item: typeof orderData.items[0] }) => (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
              />
            ))}
            <span className="text-sm font-medium ml-2">{item.rating}.0</span>
          </div>
          <span className="text-xs text-gray-500">{formatDate(item.reviewDate)}</span>
        </div>
        <p className="text-sm text-gray-700">{item.review}</p>
        <div className="flex justify-end mt-4">
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
            <MessageCircle className="w-4 h-4 mr-2" />
            Reply to Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header with Back Button and Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 px-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Orders</span>
        </Button>
        <Breadcrumbs />
      </div>
      
      <Separator />

      {/* Order Header Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Order #{orderData.orderId}</CardTitle>
              <CardDescription className="mt-2">
                Completed on {formatDate(orderData.completedDate)}
              </CardDescription>
            </div>
            <StatusBadge />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Tracking Number</p>
              <p className="font-mono text-lg font-semibold">{orderData.trackingNumber}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Order Date</p>
              <p className="text-lg">{formatDate(orderData.orderDate)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Delivery Date</p>
              <p className="text-lg">{formatDate(orderData.completedDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Products & Reviews */}
        <div className="space-y-6 lg:col-span-2">
          {/* Products with Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Products & Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {orderData.items.map((item) => (
                <div key={item.id}>
                  <div className="flex items-start gap-4 pb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-lg">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.brand}</p>
                      <p className="text-sm">Variant: {item.variant}</p>
                      <p className="text-sm">Quantity: {item.quantity}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-lg font-semibold text-primary">{formatCurrency(item.price)}</p>
                        <Badge variant="secondary" className="ml-auto">
                          Reviewed
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {item.review && <ReviewCard item={item} />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <p className="text-gray-600">Product Total</p>
                <p>{formatCurrency(orderData.summary.productTotal)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Shipping Fee</p>
                <p>{formatCurrency(orderData.summary.shippingFee)}</p>
              </div>
              <div className="flex justify-between text-green-600">
                <p>Shipping Discount</p>
                <p>-{formatCurrency(orderData.summary.shippingDiscount)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Platform Fee</p>
                <p>{formatCurrency(orderData.summary.platformFee)}</p>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-semibold">
                <p>Total Payment</p>
                <p className="text-primary">{formatCurrency(orderData.summary.totalPaid)}</p>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <p>Payment Method</p>
                <p className="font-medium">{orderData.summary.paymentMethod}</p>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <p>Payment Status</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {orderData.summary.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline & Shipping Info */}
        <div className="space-y-6">
          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {orderData.timeline.map((event, index) => (
                  <TimelineItem key={index} event={event} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Courier</p>
                <p className="font-medium">{orderData.shippingInfo.courier}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="font-medium">{orderData.shippingInfo.weight}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Dimensions</p>
                  <p className="font-medium">{orderData.shippingInfo.dimensions}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Delivery Address</p>
                <div className="bg-gray-50 p-3 rounded-md border">
                  <pre className="whitespace-pre-wrap text-sm">{orderData.addresses.delivery}</pre>
                </div>
              </div>
              {orderData.shippingInfo.deliveryProof && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Delivery Proof</p>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={orderData.shippingInfo.deliveryProof} 
                      alt="Delivery proof" 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Button className="w-full" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Seller
              </Button>
              <Button className="w-full" variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Buy Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}