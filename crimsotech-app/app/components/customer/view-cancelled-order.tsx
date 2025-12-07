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
import { 
  ArrowLeft, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Package, 
  PhilippinePeso, 
  MessageCircle,
  Info,
  ShoppingBag,
  User,
  Home,
  Phone,
  Mail,
  MapPin,
  ChevronRight
} from "lucide-react";

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
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
export default function ViewCancelledOrder() {
  const navigate = useNavigate();
  
  // Cancelled order data
  const orderData = {
    orderId: "TXNID983277",
    trackingNumber: "CAN7890123",
    orderDate: "2020-12-01",
    cancelledDate: "2020-12-03",
    cancelledTime: "14:30",
    status: "cancelled",
    sellerName: "TechWorld Shop",
    buyerName: "Rucas Royal",
    cancellationReason: "Item out of stock",
    cancellationBy: "Seller",
    refundStatus: "Processing",
    refundAmount: 599.99,
    
    items: [
      {
        id: 1,
        name: "Desktop Computer",
        brand: "TechWorld",
        variant: "Intel i7 | 16GB RAM | 1TB SSD",
        quantity: 1,
        price: 599.99,
        originalPrice: 599.99,
        image: "/public/computer.jpg",
      },
      {
        id: 2,
        name: "Wireless Keyboard",
        brand: "TechWorld",
        variant: "Black | Mechanical",
        quantity: 1,
        price: 89.99,
        originalPrice: 89.99,
        image: "/public/keyboard.jpg",
      },
    ],

    addresses: {
      seller: `TechWorld Shop\n789 Tech Avenue\nMakati City, Metro Manila\nPhilippines`,
      buyer: `Rucas Royal\n123 Main Street\nQuezon City, Metro Manila\nPhilippines`,
      billing: `123 Main Street\nQuezon City, Metro Manila\nPhilippines`
    },

    summary: {
      productTotal: 689.98,
      shippingFee: 50.00,
      transactionFee: 0.015,
      totalPaid: 749.98,
      amountRefunded: 749.98,
      paymentMethod: "Credit Card",
      paymentStatus: "Refund Processing",
    },

    timeline: [
      {
        date: "2020-12-01 10:15",
        status: "Order Placed",
        description: "Order successfully placed",
        icon: "check",
        type: "completed"
      },
      {
        date: "2020-12-01 11:30",
        status: "Payment Confirmed",
        description: "Payment received and verified",
        icon: "Php",
        type: "completed"
      },
      {
        date: "2020-12-02 09:45",
        status: "Order Processing",
        description: "Seller preparing your items",
        icon: "package",
        type: "completed"
      },
      {
        date: "2020-12-03 14:30",
        status: "Order Cancelled",
        description: "Order cancelled by seller - Item out of stock",
        icon: "x-circle",
        type: "cancelled",
        highlight: true
      },
      {
        date: "2020-12-03 15:00",
        status: "Refund Initiated",
        description: "Refund request sent to payment processor",
        icon: "dollar",
        type: "pending"
      },
      {
        date: "Estimated: 2020-12-10",
        status: "Refund Complete",
        description: "Estimated refund completion date",
        icon: "check-circle",
        type: "pending"
      }
    ],

    contactInfo: {
      sellerEmail: "support@techworld.com",
      sellerPhone: "+63 912 345 6789",
      sellerAddress: "789 Tech Avenue, Makati City",
      platformSupport: "support@platform.com",
      platformPhone: "+63 800 123 4567"
    },

    policies: {
      cancellationPolicy: "Orders can be cancelled within 24 hours of placement without penalty. After 24 hours, cancellation is subject to seller approval.",
      refundPolicy: "Full refunds are processed within 7-14 business days. Refunds will be issued to the original payment method.",
      returnPolicy: "Items cannot be returned once cancelled. If you need to purchase alternative items, please place a new order."
    }
  };

  // Reusable components
  const StatusBadge = () => (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-4 py-1.5">
      <XCircle className="w-4 h-4 mr-2" />
      Order Cancelled
    </Badge>
  );

  const RefundStatusBadge = () => (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        {orderData.refundStatus}
      </Badge>
      <span className="text-sm text-gray-600">Refund: {formatCurrency(orderData.refundAmount)}</span>
    </div>
  );

  const TimelineItem = ({ event }: { event: typeof orderData.timeline[0] }) => {
    const getIcon = () => {
      switch (event.icon) {
        case 'x-circle': return <XCircle className="w-4 h-4" />;
        case 'Php': return <PhilippinePeso className="w-4 h-4" />;
        case 'package': return <Package className="w-4 h-4" />;
        case 'check-circle': return <AlertCircle className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
      }
    };

    const getDotClass = () => {
      switch (event.type) {
        case 'cancelled': return 'bg-red-100 text-red-600 border-red-200';
        case 'completed': return 'bg-green-100 text-green-600 border-green-200';
        case 'pending': return 'bg-amber-100 text-amber-600 border-amber-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    };

    return (
      <div className="flex items-start space-x-4 py-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getDotClass()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <p className={`font-medium text-sm ${event.highlight ? 'text-red-700 font-semibold' : 'text-gray-900'}`}>
                {event.status}
              </p>
              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
            </div>
            <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
              {event.date.startsWith('Estimated: ') ? (
                <span className="text-amber-600">{event.date.replace('Estimated: ', 'Est: ')}</span>
              ) : (
                formatDateTime(event.date)
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const PolicyCard = ({ title, content }: { title: string; content: string }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-gray-500" />
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <p className="text-sm text-gray-600 pl-6">{content}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header with Back Button and Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 px-0 hover:bg-transparent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Orders</span>
        </Button>
        <Breadcrumbs />
      </div>
      
      <Separator />

      {/* Order Header Card */}
      <Card className="shadow-sm border-red-100">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Order #{orderData.orderId}</CardTitle>
              <CardDescription className="mt-2">
                Cancelled on {formatDate(orderData.cancelledDate)} at {orderData.cancelledTime}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge />
              <RefundStatusBadge />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Order Date</span>
              </div>
              <p className="font-medium">{formatDate(orderData.orderDate)}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Cancelled By</span>
              </div>
              <p className="font-medium">{orderData.cancellationBy}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="w-4 h-4" />
                <span>Reason</span>
              </div>
              <p className="font-medium">{orderData.cancellationReason}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PhilippinePeso className="w-4 h-4" />
                <span>Total Amount</span>
              </div>
              <p className="font-medium">{formatCurrency(orderData.summary.totalPaid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Products & Summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Cancelled Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {orderData.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.brand}</p>
                        <p className="text-xs text-gray-500 mt-1">Variant: {item.variant}</p>
                        <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                        <Badge variant="outline" className="mt-2 bg-red-50 text-red-700 border-red-200">
                          Cancelled
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order & Refund Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="flex justify-between">
                  <p className="text-gray-600">Platform Fee</p>
                  <p>{formatCurrency(orderData.summary.transactionFee)}</p>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-semibold">
                  <p>Total Paid</p>
                  <p className="text-gray-900">{formatCurrency(orderData.summary.totalPaid)}</p>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <p>Payment Method</p>
                  <p className="font-medium">{orderData.summary.paymentMethod}</p>
                </div>
              </CardContent>
            </Card>

            {/* Refund Details */}
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-amber-700">Refund Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Amount to Refund</p>
                  <p className="text-lg font-semibold text-amber-700">{formatCurrency(orderData.summary.amountRefunded)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600">Refund Status</p>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {orderData.summary.paymentStatus}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p>Refunds typically take 7-14 business days to process and appear in your original payment method.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Cancellation Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PolicyCard 
                title="Cancellation Policy" 
                content={orderData.policies.cancellationPolicy}
              />
              <Separator />
              <PolicyCard 
                title="Refund Policy" 
                content={orderData.policies.refundPolicy}
              />
              <Separator />
              <PolicyCard 
                title="Return Policy" 
                content={orderData.policies.returnPolicy}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline & Contact */}
        <div className="space-y-6">
          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 border-l border-gray-200">
                {orderData.timeline.map((event, index) => (
                  <TimelineItem key={index} event={event} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seller Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gray-500" />
                  <h4 className="font-medium">Seller Contact</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{orderData.contactInfo.sellerAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{orderData.contactInfo.sellerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{orderData.contactInfo.sellerEmail}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Platform Support */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <h4 className="font-medium">Platform Support</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{orderData.contactInfo.platformPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{orderData.contactInfo.platformSupport}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button className="w-full" variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Seller
              </Button>
              <Button className="w-full" variant="outline">
                <AlertCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </CardFooter>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full" variant="default">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Shop Similar Items
              </Button>
              <Button className="w-full" variant="outline">
                <AlertCircle className="w-4 h-4 mr-2" />
                Report an Issue
              </Button>
              <Button className="w-full" variant="outline">
                <PhilippinePeso className="w-4 h-4 mr-2" />
                View Refund Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}