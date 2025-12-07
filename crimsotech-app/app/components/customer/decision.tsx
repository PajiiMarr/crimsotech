// pages/decision.tsx
"use client";

import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Info,
  Shield,
  Truck,
  Calendar,
  Package,
  Mail,
  Phone,
  ArrowLeft,
  Home,
  ChevronRight,
  ExternalLink,
  FileText,
  Download,
  Copy,
  Check
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
          Refund & Return Policy
        </h2>
        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Processing Timeline</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>Review: <strong>1-2 business days</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-500" />
                <span>Return Window: <strong>7 calendar days</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Refund Processing: <strong>3-5 business days</strong></span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Important Notes</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Keep all packaging and accessories until process is complete</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Save your shipping receipt and tracking number</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Ensure item is in original condition for return</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Need Help?</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@ecommerce.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+63 123 456 7890</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Mock Data ---
const mockRequestData = {
  orderId: 'ORD-789012',
  itemName: 'Tufflow 2GB RAM 32GB ROM',
  price: 300.00,
  requestDate: '2025-04-06',
  decisionDate: '2025-04-07',
  reason: 'Product arrived with visible scratches and damaged packaging.',
  requestedMethod: 'Return Item & Refund to Wallet',
  status: 'approved', // 'approved' | 'rejected' | 'under_review'
  adminNotes: 'Based on the evidence provided, we approve your refund request. Please follow the return instructions below.',
  returnDeadline: '2025-04-14',
  expectedRefundDate: '2025-04-12'
};

// --- Decision Display Component ---
const DecisionDisplay: React.FC<{ status: string; orderId: string }> = ({ status, orderId }) => {
  if (status === 'approved') {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="font-semibold text-lg">Refund Request Approved!</div>
          <p className="mt-1">Your request for Order {orderId} has been approved.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'rejected') {
    return (
      <Alert className="bg-red-50 border-red-200">
        <XCircle className="w-5 h-5 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="font-semibold text-lg">Refund Request Rejected</div>
          <p className="mt-1">Your request for Order {orderId} could not be approved.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Clock className="w-5 h-5 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="font-semibold text-lg">Request Under Review</div>
        <p className="mt-1">Your request for Order {orderId} is being reviewed by our team.</p>
      </AlertDescription>
    </Alert>
  );
};

// --- Timeline Component ---
const RequestTimeline: React.FC<{ status: string; submittedDate?: string; decisionDate?: string }> = ({ status, submittedDate, decisionDate }) => {
  const timelineSteps = [
    {
      step: 1,
      title: 'Request Submitted',
      date: submittedDate || 'April 06, 2025',
      time: '10:30 AM',
      completed: true
    },
    {
      step: 2,
      title: 'Under Review',
      date: submittedDate || 'April 06-07, 2025',
      time: '',
      completed: status !== 'pending'
    },
    {
      step: 3,
      title: 'Decision Made',
      date: decisionDate || 'April 07, 2025',
      time: '02:15 PM',
      completed: status === 'approved' || status === 'rejected'
    },
    {
      step: 4,
      title: status === 'approved' ? 'Process Return' : 'Review Completed',
      date: status === 'approved' ? 'By April 14, 2025' : decisionDate || 'April 07, 2025',
      time: '',
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg">Request Timeline</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {timelineSteps.map((step, index) => (
          <div key={step.step} className="flex items-start gap-4 mb-8 relative">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
              {step.completed ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">{step.step}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </h4>
                <div className="text-sm text-gray-500">
                  <span>{step.date}</span>
                  {step.time && <span className="ml-2">{step.time}</span>}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {step.step === 1 && 'Your refund request was successfully submitted.'}
                {step.step === 2 && 'Our support team is reviewing your request and evidence.'}
                {step.step === 3 && status === 'approved' && 'Your request has been approved!'}
                {step.step === 3 && status === 'rejected' && 'Your request has been reviewed and cannot be approved.'}
                {step.step === 4 && status === 'approved' && 'Follow the instructions below to complete your return.'}
                {step.step === 4 && status === 'rejected' && 'The review process for your request is complete.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Admin Notes Component ---
const AdminNotes: React.FC<{ notes?: string; status: string; returnDeadline?: string }> = ({ notes, status, returnDeadline }) => {
  const displayNotes = notes || 'Your request is currently under review. Our support team will update you soon.';
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-lg">Administrator Notes</h3>
      </div>
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-6">
          <p className="text-gray-700">{displayNotes}</p>
          {status === 'approved' && returnDeadline && (
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700">Return Deadline: {returnDeadline}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// --- Next Steps Component ---
const NextSteps: React.FC<{ 
  status: string; 
  requestedMethod?: string;
  orderId?: string;
}> = ({ status, requestedMethod, orderId }) => {
  const navigate = useNavigate();

  if (status === 'approved') {
    const isReturnMethod = requestedMethod?.includes('Return Item');
    
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Next Steps</h3>
        
        {isReturnMethod ? (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Return the Item</h4>
                  <p className="text-sm text-green-700 mt-1">
                    You need to return the item to complete your refund process.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-sm">Prepare Package</h4>
                  <p className="text-xs text-gray-600 mt-1">Pack item securely with all accessories</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-sm">Ship Item</h4>
                  <p className="text-xs text-gray-600 mt-1">Use provided instructions to ship</p>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-sm">Get Refund</h4>
                  <p className="text-xs text-gray-600 mt-1">Receive refund after verification</p>
                </CardContent>
              </Card>
            </div>

            <Button 
                onClick={() => {
                    console.log('Navigating to process-return-item with:', { orderId, requestedMethod });
                    navigate('/process-return-item/:id', { 
                    state: { orderId, requestedMethod }
                    });
                }}
                className="w-full py-6 text-lg"
                size="lg"
                >
                Proceed to Process Return
                <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
          </div>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Partial Refund Approved</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your partial refund will be processed to your {requestedMethod?.replace('Keep Item & Partial ', '') || 'selected method'}.
                    No return is required.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Next Steps</h3>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <h4 className="font-semibold">Request Not Approved</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Your refund request could not be approved based on the provided evidence and our policy guidelines.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <h5 className="font-medium">You can:</h5>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>Contact seller directly to discuss the issue</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>Request a re-evaluation with additional evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>Contact our support team for assistance</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

// --- Main Component ---
export default function DecisionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from navigation or use mock data
  const requestData = location.state || mockRequestData;
  
  // Extract data with safety checks
  const status = requestData?.status || 'under_review';
  const orderId = requestData?.orderId || mockRequestData.orderId;
  const itemName = requestData?.itemName || mockRequestData.itemName;
  const price = requestData?.itemPrice || requestData?.price || mockRequestData.price;
  const requestedMethod = requestData?.methodLabel || requestData?.requestedMethod || mockRequestData.requestedMethod;
  const reason = requestData?.reason || mockRequestData.reason;
  const adminNotes = requestData?.adminNotes || mockRequestData.adminNotes;
  const submittedDate = requestData?.submittedDate || mockRequestData.requestDate;
  const decisionDate = requestData?.decisionDate || mockRequestData.decisionDate;
  const returnDeadline = requestData?.returnDeadline || mockRequestData.returnDeadline;
  
  // Format price safely
  const formattedPrice = `₱${price?.toFixed?.(2) || '0.00'}`;

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
            <span className="font-semibold">Back to Request</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Refund Request Decision
          </h1>
          <p className="text-gray-600">
            View the status of your refund request
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Policy */}
          <div className="lg:col-span-1">
            <PolicySection />
          </div>

          {/* Right Column: Decision Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Decision Banner */}
            <DecisionDisplay status={status} orderId={orderId} />

            {/* Request Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Order Number</p>
                      <p className="font-semibold">{orderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Item</p>
                      <p className="font-semibold">{itemName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Requested Method</p>
                      <p className="font-semibold">{requestedMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Refund Amount</p>
                      <p className="font-semibold">{formattedPrice}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Reason */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Your Reason</p>
                    <p className="text-gray-700">{reason}</p>
                  </div>

                  <Separator />

                  {/* Timeline */}
                  <RequestTimeline 
                    status={status} 
                    submittedDate={submittedDate}
                    decisionDate={decisionDate}
                  />

                  <Separator />

                  {/* Admin Notes */}
                  <AdminNotes 
                    notes={adminNotes} 
                    status={status}
                    returnDeadline={returnDeadline}
                  />

                  <Separator />

                  {/* Next Steps */}
                  <NextSteps 
                    status={status} 
                    requestedMethod={requestedMethod}
                    orderId={orderId}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Important Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Processing Time</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Refunds are typically processed within 3-5 business days after return verification.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-500" />
                        <span className="font-medium">Documentation</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Keep all shipping receipts and tracking numbers for reference.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">Notifications</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        You'll receive email updates at every stage of the process.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">Support</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Contact support if you have questions about the process.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}