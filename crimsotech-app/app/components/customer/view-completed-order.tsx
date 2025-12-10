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
import { Link } from 'react-router';

import { ArrowLeft, CheckCircle, Download, MessageCircle, Star, Package, Calendar, Clock, PhilippinePeso } from "lucide-react";

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

// StatusBadge (Reduced size)
const StatusBadge = () => (
  // Reduced padding (px-2 py-0.5) and text/icon size (w-3 h-3)
  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-2 py-0.5 text-xs h-auto">
    <CheckCircle className="w-3 h-3 mr-1" />
    Completed
  </Badge>
);

// TimelineItem (Reduced size and height)
const TimelineItem = ({ event }: { event: typeof orderData.timeline[0] }) => (
  // Reduced vertical padding (py-2) and space (space-x-3)
  <div className="flex items-start space-x-3 py-2">
    {/* Reduced dot size (w-5 h-5) and icon size (w-3 h-3) */}
    <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center ${
      event.highlight ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
    }`}>
      {event.icon === 'check-circle' && <CheckCircle className="w-3 h-3" />}
      {event.icon === 'package' && <Package className="w-3 h-3" />}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
        <div>
          {/* Reduced font size to xs/sm */}
          <p className="font-medium text-sm leading-tight">{event.status}</p>
          <p className="text-xs text-gray-500">{event.description}</p>
        </div>
        {/* Reduced date font size to 2xs (or use text-xs) */}
        <p className="text-[10px] text-gray-500 ml-2">{formatDateTime(event.date)}</p>
      </div>
    </div>
  </div>
);

  // Review Card (Made SMALLEST)
const ReviewCard = ({ item }: { item: typeof orderData.items[0] }) => (
  // Reduced padding and removed Card component
  <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 text-xs space-y-1">
    
    {/* Top Row: Rating, Date, and Action combined */}
    <div className="flex items-center justify-between">
      {/* Condensed Rating Display */}
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="px-2 py-0.5 text-xs h-auto">
          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
          {item.rating}.0
        </Badge>
        <span className="text-gray-500">{formatDate(item.reviewDate)}</span>
      </div>
      
      {/* View Review button (Link style) */}
      <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-800 h-6 p-0 text-xs">
        <MessageCircle className="w-3 h-3 mr-1" />
        View Review
      </Button>
    </div>
    
    {/* Review Text */}
    <p className="italic text-gray-700 line-clamp-1 overflow-hidden">
      "{item.review}"
    </p>
  </div>
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
      <Card className="shadow-sm">
  {/* Reduced padding in CardHeader */}
  <CardHeader className="py-3 px-4">
    <div className="flex justify-between items-center">
      <div>
        {/* Reduced title size */}
        <CardTitle className="text-xl font-bold">Order #{orderData.orderId}</CardTitle>
        {/* Reduced margin and description font size */}
        <CardDescription className="mt-1 text-xs text-gray-500">
          Completed on {formatDate(orderData.completedDate)}
        </CardDescription>
      </div>
      {/* Assuming StatusBadge is already compacted */}
      <StatusBadge />
    </div>
  </CardHeader>
  {/* Reduced padding and grid gap */}
  <CardContent className="py-3 px-4">
    {/* Reduced grid gap (gap-4) and content font sizes (text-sm/text-base) */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-sm">
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">Tracking Number</p>
        <p className="font-mono text-base font-semibold">{orderData.trackingNumber}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">Order Date</p>
        <p className="text-base">{formatDate(orderData.orderDate)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">Delivery Date</p>
        <p className="text-base">{formatDate(orderData.completedDate)}</p>
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
              <Link to={`/request-refund/${orderData.orderId}`}>
                <Button className="w-full" variant="outline">
                  <PhilippinePeso className="w-4 h-4 mr-2" />
                  Ask for Refund
                </Button>
               </Link>
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