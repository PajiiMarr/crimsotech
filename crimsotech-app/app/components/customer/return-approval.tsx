// pages/return-approval.tsx
"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Package,
  Truck,
  Calendar,
  Clock,
  AlertCircle,
  Info,
  Shield,
  MapPin,
  ArrowLeft,
  ChevronRight,
  FileText,
  Check,
  Download,
  Printer,
  Phone,
  Mail,
  Copy // Added Copy icon
} from 'lucide-react';

// Shadcn Components
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import Breadcrumbs from '~/components/ui/breadcrumbs';

// --- Policy Section Component ---
const PolicySection: React.FC = () => (
  <Card className="h-fit sticky top-6">
    <CardContent className="p-6">
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Return Process Guidelines
        </h2>
        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Return Requirements</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Item must be in original condition with all accessories</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Original packaging should be included when possible</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Write order number on the outside of the package</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Shipping Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Use secure packaging to prevent damage during transit</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Choose a trackable shipping method</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>Ship within 7 days of approval to avoid cancellation</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Need Help?</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>returns@ecommerce.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+63 987 654 3210</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Mock Data ---
const returnData = {
  orderId: 'ORD-789012',
  itemName: 'Tufflow 2GB RAM 32GB ROM',
  price: 300.00,
  approvalDate: '2025-04-07',
  returnDeadline: '2025-04-14',
  refundMethod: 'E-Wallet (GCash)',
  returnAddress: 'Purok 8, Eme Street, Ayala, Zamboanga City',
  adminNotes: 'Based on the evidence provided, we approve your return request. Please follow the return instructions carefully.',
  expectedRefundDate: '2025-04-12',
  trackingDeadline: '2025-04-09',
  returnId: 'RET-456789'
};

// --- Step Component ---
const Step: React.FC<{
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed?: boolean;
  current?: boolean;
}> = ({ number, title, description, icon: Icon, completed, current }) => (
  <div className="flex items-start gap-4">
    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${completed ? 'bg-green-100' : current ? 'bg-blue-100' : 'bg-gray-100'}`}>
      {completed ? (
        <Check className="w-5 h-5 text-green-600" />
      ) : current ? (
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-sm font-semibold">{number}</span>
        </div>
      ) : (
        <Icon className="w-5 h-5 text-gray-400" />
      )}
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${completed ? 'text-green-700' : current ? 'text-blue-700' : 'text-gray-700'}`}>
          {title}
        </h4>
        {current && (
          <Badge className="bg-blue-100 text-blue-700">Current Step</Badge>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  </div>
);

// --- Return Address Component ---
const ReturnAddressCard: React.FC = () => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(returnData.returnAddress);
    // In a real app, you might want to show a toast notification here
    alert('Address copied to clipboard!');
  };

  return (
    <Card className="border-blue-100 bg-blue-50">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Return Shipping Address</h3>
            </div>
            <Badge className="bg-blue-100 text-blue-700">Use This Address</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <p className="font-mono text-sm">{returnData.returnAddress}</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Include Order #: <strong>{returnData.orderId}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Return ID: <strong>{returnData.returnId}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCopyAddress}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
            <Button variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Label
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Instructions Component ---
const ReturnInstructions: React.FC = () => (
  <div className="space-y-6">
    <h3 className="font-semibold text-lg flex items-center gap-2">
      <Info className="w-5 h-5 text-blue-600" />
      Return Instructions
    </h3>
    
    <div className="space-y-4">
      <Step
        number={1}
        title="Prepare the Item"
        description="Place the item in its original packaging with all accessories. Write the order number on the outside of the package."
        icon={Package}
        current
      />
      
      <Step
        number={2}
        title="Pack Securely"
        description="Use bubble wrap or packing material to protect the item during transit. Seal the package securely."
        icon={Package}
      />
      
      <Step
        number={3}
        title="Ship the Item"
        description="Take the package to any courier service (LBC, J&T, etc.) and ship to the return address above."
        icon={Truck}
      />
      
      <Step
        number={4}
        title="Submit Tracking Info"
        description="After shipping, submit your tracking number on the next page to track your return."
        icon={FileText}
      />
      
      <Step
        number={5}
        title="Wait for Verification"
        description="We will inspect the returned item (1-2 business days) before processing your refund."
        icon={CheckCircle}
      />
      
      <Step
        number={6}
        title="Receive Refund"
        description="Refund will be sent to your e-wallet within 24 hours of verification."
        icon={CheckCircle}
      />
    </div>
  </div>
);

// --- Important Notes Component ---
const ImportantNotes: React.FC = () => (
  <Alert className="bg-amber-50 border-amber-200">
    <AlertCircle className="w-5 h-5 text-amber-600" />
    <AlertDescription className="text-amber-800">
      <div className="font-semibold">Important Notes:</div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>• You have until <strong>{returnData.returnDeadline}</strong> to ship the item</li>
        <li>• Submit tracking information within 24 hours of shipping</li>
        <li>• Keep your shipping receipt for reference</li>
        <li>• Refund will be cancelled if item is not received by {returnData.returnDeadline}</li>
        <li>• Original shipping costs are not refundable</li>
      </ul>
    </AlertDescription>
  </Alert>
);

// --- Main Component ---
export default function ReturnApprovalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to Decision</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Return Instructions & Process
          </h1>
          <p className="text-gray-600">
            Follow these steps to complete your return and receive your refund
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Policy */}
          <div className="lg:col-span-1">
            <PolicySection />
          </div>

          {/* Right Column: Return Process */}
          <div className="lg:col-span-2 space-y-6">
            {/* Approval Banner */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold text-lg">Return Approved!</div>
                <p className="mt-1">
                  Your return request for Order {returnData.orderId} has been approved. 
                  Please follow the instructions below to complete your return.
                </p>
              </AlertDescription>
            </Alert>

            {/* Request Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="font-semibold">{returnData.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Item</p>
                    <p className="font-semibold">{returnData.itemName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Refund Method</p>
                    <p className="font-semibold">{returnData.refundMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Refund Amount</p>
                    <p className="font-semibold">₱{returnData.price.toFixed(2)}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Approval Date</p>
                    <p className="font-semibold">{returnData.approvalDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Return Deadline</p>
                    <Badge className="bg-amber-100 text-amber-700">
                      {returnData.returnDeadline}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tracking Deadline</p>
                    <p className="font-semibold">{returnData.trackingDeadline}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Refund</p>
                    <p className="font-semibold">{returnData.expectedRefundDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card className="border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Administrator Notes</h3>
                </div>
                <p className="text-gray-700">{returnData.adminNotes}</p>
              </CardContent>
            </Card>

            {/* Return Address */}
            <ReturnAddressCard />

            {/* Important Notes */}
            <ImportantNotes />

            {/* Return Instructions */}
            <Card>
              <CardContent className="p-6">
                <ReturnInstructions />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/process-return-item')}
                className="w-full py-6 text-lg"
                size="lg"
              >
                Proceed to Submit Tracking Information
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Instructions
                </Button>
                <Button variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print This Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}