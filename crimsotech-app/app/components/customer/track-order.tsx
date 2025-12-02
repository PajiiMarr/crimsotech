"use client";

// --- REACT ROUTER IMPORT ---
import { useNavigate } from 'react-router-dom'; // Changed from 'next/navigation'
import type { Route } from './+types/track-order';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button'; 
import { Separator } from '~/components/ui/separator';
import Breadcrumbs from '~/components/ui/breadcrumbs';
import { Check, ArrowLeft } from "lucide-react"; 

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
};

// --- Status Flow Configuration ---
const orderSteps = [
  { name: "Order Confirmed", detail: "Seller confirmation", key: "confirmed" },
  { name: "Shipped", detail: "Left warehouse", key: "shipped" },
  { name: "Out for Delivery", detail: "With courier", key: "out_for_delivery" },
  { name: "Delivered", detail: "Order completed", key: "delivered" },
];

// --- Metadata (Assuming your routing system uses this) ---
export function meta(): Route.MetaDescriptors {
  return [{ title: "Track Order" }];
}

// --- Main Component ---
export default function TrackOrder() {
  const navigate = useNavigate(); // Initialized useNavigate hook
  
  // Current status set to 'out_for_delivery' to reflect the current stage of shipment.
  const currentStatusKey = "out_for_delivery";

  // Data (omitted for brevity)
  const trackingNumber = "34u2394y239y";
  const orderId = "TXNID983274";
  const orderDate = "2020-11-20"; 
  const sellerAddress = `Double CTRL Z\n1234 Market Street, Apt 56\nPhiladelphia, PA 19107\nUSA`;
  const buyerAddress = `Rucas Royal\n4567 Elm Street, Apt 3B\nPhiladelphia, PA 19104\nUSA, Near University City`;

  const items = [
    {
      name: "Sneakers INVERNI BW",
      brand: "Sneakers",
      variant: "Black | Size: 44",
      quantity: 1,
      price: 449000,
      image: "/public/phon.jpg",
    },
    {
      name: "Jacket PISSED",
      brand: "Catalystwist",
      variant: "Black | Size: XL",
      quantity: 1,
      price: 439000,
      image: "/public/power_supply.jpg",
    },
  ];

  const summary = {
    productTotal: 888000,
    shippingDiscount: 7500,
    platformFee: 4000,
    totalPaid: 876500,
    paymentMethod: "Cash On Delivery (COD)",
  };

  const deliveryEvents = [
    {
      date: "2020-11-20 10:00", status: "Order Confirmed", key: "confirmed", 
      note: "Seller preparing shipment.", location: "Double CTRL Z Warehouse",
    },
    {
      date: "2020-11-23 08:00", status: "Shipped", key: "shipped", 
      note: "Package handed over to courier. Left Chicago Hub.", location: "Chicago Sorting Facility",
    },
    {
      date: "2020-11-24 14:30", status: "Arrived at Local Distribution Center", key: "transit", 
      note: "Awaiting assignment for final delivery.", location: "Philadelphia Hub",
    },
    {
      date: "2020-11-25 09:15", status: "Out for Delivery", key: "out_for_delivery", 
      note: "Estimated delivery today by 17:00.", location: "Near University City",
    },
    {
      date: "Pending", status: "Delivered", key: "delivered", 
      note: "Awaiting final confirmation.", location: "Buyer Address",
    },
  ];

  const currentStepIndex = orderSteps.findIndex(step => step.key === currentStatusKey);
  const getStepIndex = (key: string) => {
    return orderSteps.findIndex(step => step.key === key);
  }

  // --- REUSABLE COMPONENTS (omitted for brevity) ---
  const StatusStepper = () => (
    <div className="flex justify-between space-x-2">
      {orderSteps.map((step, index) => {
        const isCurrent = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        const statusClass = isCurrent
          ? "border-primary bg-card shadow-md text-primary font-bold" 
          : isCompleted
            ? "border-primary/50 bg-primary/10 text-primary/80" 
            : "border-input bg-muted text-muted-foreground"; 

        return (
          <div
            key={step.key}
            className={`flex flex-col items-center flex-1 p-3 rounded-lg border transition-colors duration-200 ${statusClass}`}
          >
            <div className="text-sm font-medium text-center leading-tight">
              {step.name}
            </div>
            <div className={`text-xs text-center leading-tight mt-1 ${isCompleted ? 'text-primary/70' : 'text-muted-foreground'}`}>
              {step.detail}
            </div>
          </div>
        );
      })}
    </div>
  );

  const OrderDetailsCard = () => (
    <div className="pt-4 pb-0 space-y-2 text-sm text-muted-foreground">
      <div className="flex justify-between items-center pb-2 border-b">
        <p className="text-2xl font-bold text-foreground">Order ID: {orderId}</p>
      </div>
      <div className="flex justify-between">
        <p className="font-medium text-foreground/70">Tracking Number:</p>
        <p className="font-mono text-base font-semibold text-primary">{trackingNumber}</p>
      </div>
      <div className="flex justify-between">
        <p className="font-medium text-foreground/70">Order Date:</p>
        <p className="text-base text-foreground">{orderDate}</p>
      </div>
    </div>
  );

  // --- MAIN COMPONENT RENDER ---

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      
      {/* ⬅️ BACK BUTTON & BREADCRUMBS ROW */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          // KEY CHANGE: Use navigate(-1) to go back in React Router history
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-900 px-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Orders</span>
        </Button>
        <Breadcrumbs />
      </div>
      
      <Separator />

      {/* Top Status and Details Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Track Order Details</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Real-time status and progress for your shipment.</p>
        </CardHeader>
        <CardContent>
          <OrderDetailsCard />
          <Separator className="my-6" />
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Status Flow</h3>
          <StatusStepper />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT & MIDDLE COLUMNS: Order Info (2/3 width on large screens) */}
        <div className="space-y-6 lg:col-span-2">

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-4 border-b pb-4 last:border-b-0 last:pb-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <div className="flex-1 text-sm text-muted-foreground">
                    <p className="font-bold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                    <p className="text-sm">Variant: {item.variant}</p>
                    <p className="text-sm">Quantity: {item.quantity}</p>
                    <p className="text-base font-semibold text-primary mt-1">{formatCurrency(item.price)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Addresses & Summary in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Addresses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Shipping Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground mb-1">Seller Address</p>
                  <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md border text-xs text-foreground">{sellerAddress}</pre>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Buyer Address</p>
                  <pre className="whitespace-pre-wrap bg-muted p-3 rounded-md border text-xs text-foreground">{buyerAddress}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <p>Product Price:</p>
                  <p className="text-foreground">{formatCurrency(summary.productTotal)}</p>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <p>Shipping Discount:</p>
                  <p>-{formatCurrency(summary.shippingDiscount)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Platform Fees:</p>
                  <p className="text-foreground">+{formatCurrency(summary.platformFee)}</p>
                </div>
                
                <div className="flex justify-between text-foreground pt-2 font-medium">
                  <p>Payment Method:</p>
                  <p className="font-semibold text-primary">{summary.paymentMethod}</p>
                </div>

                <Separator className="my-2" />
                
                <div className="flex justify-between font-normal text-xl text-primary">
                  <p>Total Payment:</p>
                  <p>{formatCurrency(summary.totalPaid)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: Timeline (1/3 width on large screens) */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Delivery History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border space-y-8 pl-4">
              {deliveryEvents.map((event, idx) => {
                const stepIndex = getStepIndex(event.key);
                
                let isCompleted = false;
                let isCurrent = false;

                if (stepIndex !== -1) {
                    isCompleted = stepIndex < currentStepIndex;
                    isCurrent = event.key === currentStatusKey; 
                } else {
                    const previousMainStepIndex = deliveryEvents.slice(0, idx)
                        .map(e => getStepIndex(e.key))
                        .filter(i => i !== -1)
                        .pop();
                        
                    if (previousMainStepIndex !== undefined) {
                        isCompleted = previousMainStepIndex < currentStepIndex;
                    }
                    if (idx < deliveryEvents.findIndex(e => e.key === currentStatusKey)) {
                        isCompleted = true;
                    }
                }

                const dotColor = (isCompleted || isCurrent) ? 'bg-primary border-primary' : 'bg-background border-input';
                const textColor = (isCompleted || isCurrent) ? 'text-primary' : 'text-foreground';
                
                return (
                  <li key={idx} className="ml-2">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-2 w-4 h-4 rounded-full border-2 ${dotColor} flex items-center justify-center`}>
                        {(isCompleted || isCurrent) && (
                            <Check className="h-2.5 w-2.5 text-background" />
                        )}
                    </div>

                    <p className={`text-sm font-semibold ${textColor}`}>
                      {event.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                    <p className="text-xs text-foreground mt-1">{event.note}</p>
                    <p className="text-xs text-muted-foreground">Location: {event.location}</p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}