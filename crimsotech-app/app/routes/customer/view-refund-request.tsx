"use client";

import React, { useState } from 'react';
import type { Route } from './+types/view-refund-request';
import { useParams, useNavigate } from 'react-router-dom';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import Breadcrumbs from "~/components/ui/breadcrumbs";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  RotateCcw,
  FileText,
  Download,
  Image as ImageIcon,
  User,
  XCircle,
  MessageCircle,
  ShoppingBag,
  CreditCard,
  ChevronDown,
  PhilippinePeso,
   Send, // Add this
  DollarSign, // Add this
  Wallet, // Add this
  Tag, // Add this
  RefreshCw, // Add this
  Banknote, // Add this
  MessageSquare, // Added for Reason icon
  X, // Added for Dialog close icon
} from 'lucide-react';
// Mock Dialog components for completeness - replace with actual UI library imports
const Dialog = (props: any) => <div {...props}>{props.children}</div>;
const DialogContent = (props: any) => <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" {...props}>{props.children}</div>;
const DialogHeader = (props: any) => <div className="p-4 border-b" {...props}>{props.children}</div>;
const DialogTitle = (props: any) => <h2 className="text-xl font-semibold" {...props}>{props.children}</h2>;


// --- Component Metadata (Unchanged) ---
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Refund Request",
    },
  ];
}

// --- Status Configuration (Unchanged) ---
const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: Clock,
    description: 'Awaiting seller review'
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: MessageCircle,
    description: 'Negotiating terms with customer'
 },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
    description: 'Request approved, ready for processing'
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 hover:bg-red-100',
    icon: XCircle,
    description: 'Request rejected by seller'
  },
  waiting: {
    label: 'Waiting for Return',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: Clock,
    description: 'Accepted return, waiting for item return'
  },
  to_process: {
    label: 'To Process',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: Clock,
    description: 'Ready for refund processing'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
    description: 'Refund successfully completed'
  }
};

// --- Loader/Mock Data (Unchanged) ---
export async function loader({ params }: Route.LoaderArgs) {
  const { refundId } = params;

  // Mock data structure - NOTE: The live status will depend on how the URL is loaded,
  // but for the sake of presentation, we'll keep the default 'pending' here.
  // The main component handles URL status overrides.
  const refundDetails = {
    refund: refundId,
    order: {
      order_id: "ORD-2024-00123",
    },
    customer: {
      name: "John Doe",
      email: "john@example.com",
      username: "john_doe"
    },
    reason: "Product defective - screen has dead pixels upon arrival",
    status: "approved", // Default mock status
    requested_at: "2024-01-20T10:30:00Z",
    refund_amount: 45000,
    preferred_refund_method: "Return Item and Refund to Wallet",
    attachments: [
      // Mocked attachments are provided by the loader/backend
      { id: 1, name: "defect1.jpg", url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop", type: "image" },
      { id: 2, name: "defect2.jpg", url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop", type: "image" },
      { id: 3, name: "Receipt.pdf", url: "/documents/receipt.pdf", type: "document" },
      { id: 4, name: "OriginalBox.jpg", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop", type: "image" },
    ]
  };

  return {
    user: {
      id: "demo-seller-123",
      name: "Jane Seller",
      email: "seller@example.com",
      isCustomer: false,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: true,
      username: "jane_seller",
    },
    refundDetails
  };
}

// --- Status-Specific UI Components (Minor additions for clarity/completeness) ---


// Helper function to handle the image download
const handleDownload = (imageUrl: string, fileName: string) => {
  fetch(imageUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url); // Clean up the URL
    })
    .catch((error) => console.error('Error downloading the image:', error));
};

function PendingStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState<string>('evidence.jpg');

  const attachments = refundDetails.attachments || [];

  const handleImagePreview = (attachment: { url: string; name: string }) => {
    setSelectedImage(attachment.url);
    setSelectedImageName(attachment.name || 'evidence.jpg');
    setShowImageModal(true);
  };

  const handleModalClose = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setSelectedImageName('evidence.jpg');
  };

  const downloadImage = () => {
    if (selectedImage && selectedImageName) {
      handleDownload(selectedImage, selectedImageName);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  #{refundDetails.refund}
                </CardTitle>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Customer
                  </p>
                  <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                  {refundDetails.customer.email && (
                    <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />
                    Order
                  </p>
                  <p className="font-medium text-sm">{refundDetails.order.order_id}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Requested
                  </p>
                  <p className="font-medium text-sm">{formatDate(refundDetails.requested_at)}</p>
                </div>

                {refundDetails.preferred_refund_method && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Preferred Refund Method
                    </p>
                    <p className="font-medium text-sm">{refundDetails.preferred_refund_method}</p>
                  </div>
                )}
              </div>

              {/* Compact Amount Display */}
              <div className="bg-muted/20 rounded p-3 border">
                <p className="text-xs text-muted-foreground mb-1">Refund Amount</p>
                <p className="text-2xl font-bold flex items-center gap-1 text-green-700">
                  <PhilippinePeso className="h-5 w-5" />
                  {formatCurrency(refundDetails.refund_amount)}
                </p>
              </div>

              {/* Reason - Compact */}
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Reason
                </p>
                <div className="bg-muted/10 p-3 rounded border text-sm">
                  {refundDetails.reason}
                </div>
              </div>

              {/* Evidence - Smaller Thumbnails */}
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <ImageIcon className="h-3 w-3" />
                  Evidence ({attachments.length})
                </p>

                <div className="grid grid-cols-4 gap-2 mb-3"> 
                  {attachments.filter((a: any) => a.type === 'image').slice(0, 8).map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="relative cursor-pointer group"
                      onClick={() => handleImagePreview(attachment)} 
                    >
                      <div className="aspect-square rounded overflow-hidden border bg-muted/30"> 
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Compact */}
        <div className="space-y-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request ID:</span>
                <span className="font-medium">#{refundDetails.refund}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                  Review
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Files:</span>
                <span className="font-medium">{attachments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline:</span>
                <span className="font-medium">48h</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Review evidence and decide
              </p>

              <Button
                onClick={() => handleStatusChange('approved')}
                className="w-full bg-green-600 hover:bg-green-700 h-10"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve
              </Button>

              <Button
                onClick={() => handleStatusChange('negotiation')}
                variant="outline"
                className="w-full text-red-600 border-red-300 hover:bg-red-50 h-10 text-sm"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p className="font-medium mb-0.5">Note:</p>
                <p className="text-xs">• Approve: Process refund</p>
                <p className="text-xs">• Reject: Provide reason</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Image Modal - Normal modal appearance */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Image container */}
            <div className="relative h-[calc(90vh-80px)] flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt="Evidence preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={downloadImage}
                className="bg-white hover:bg-gray-100 shadow-md"
                title="Download Image"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleModalClose}
                className="bg-white hover:bg-gray-100 shadow-md"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600 truncate">
                {selectedImageName}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedImage, '_blank')}
              >
                Open in new tab
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ApprovedStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                #{refundDetails.refund}
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </p>
                <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                {refundDetails.customer.email && (
                  <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Order
                </p>
                <p className="font-medium text-sm">{refundDetails.order.order_id}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Requested
                </p>
                <p className="font-medium text-sm">{formatDate(refundDetails.requested_at)}</p>
              </div>

              {refundDetails.preferred_refund_method && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Refund Method
                  </p>
                  <p className="font-medium text-sm">{refundDetails.preferred_refund_method}</p>
                </div>
              )}
            </div>

            {/* Compact Amount Display */}
            <div className="bg-muted/20 rounded p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Refund Amount</p>
              <p className="text-2xl font-bold flex items-center gap-1 text-green-700">
                <PhilippinePeso className="h-5 w-5" />
                {formatCurrency(refundDetails.refund_amount)}
              </p>
            </div>

            {/* Reason - Compact */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                Reason
              </p>
              <div className="bg-muted/10 p-3 rounded border text-sm">
                {refundDetails.reason}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-medium">#{refundDetails.refund}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                Approved
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{refundDetails.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(refundDetails.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Step:</span>
              <span className="font-medium text-green-600">Process refund</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Process Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 h-10"
              onClick={() => handleStatusChange('waiting')}
              size="sm"
            >
              Start Return Process
            </Button>

            <Button
              variant="outline"
              className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 h-10"
              onClick={() => handleStatusChange('to_process')}
              size="sm"
            >
              Skip Return & Process Refund
            </Button>

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <p className="font-medium mb-0.5">Note:</p>
              <p className="text-xs">• Return Process: Customer returns item first</p>
              <p className="text-xs">• Skip Return: Refund immediately</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => handleStatusChange('pending')}
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Review
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              Generate Approval Letter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function NegotiationStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  
  // Negotiation reasons
  const negotiationReasons = [
    {
      id: 'reject_complete',
      label: 'Reject Completely',
      description: 'Request does not meet any requirements for approval',
      requiresMethod: false,
      action: 'reject'
    },
    {
      id: 'different_method',
      label: 'Different Refund Method Preferred',
      description: 'Cannot use customer\'s preferred method, suggest alternative',
      requiresMethod: true,
      action: 'negotiate'
    },
    {
      id: 'partial_only',
      label: 'Partial Refund Only',
      description: 'Item has minor issues, suggest partial refund instead',
      requiresMethod: true,
      action: 'negotiate'
    },
    {
      id: 'return_required',
      label: 'Return Required for Refund',
      description: 'Customer must return item for any refund',
      requiresMethod: true,
      action: 'negotiate'
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Specify other reason for negotiation',
      requiresMethod: false,
      action: 'negotiate'
    }
  ];

  // Refund methods for suggestion
  const refundMethods = [
    {
      id: 'wallet-return',
      label: 'Return Item & Refund to Wallet',
      type: 'return'
    },
    {
      id: 'bank-return',
      label: 'Return Item & Bank Transfer',
      type: 'return'
    },
    {
      id: 'voucher-return',
      label: 'Return Item & Store Voucher',
      type: 'return'
    },
    {
      id: 'replace',
      label: 'Return & Replacement',
      type: 'return'
    },
    {
      id: 'moneyback-return',
      label: 'Return Item & Money Back',
      type: 'return'
    },
    {
      id: 'wallet-keep',
      label: 'Keep Item & Partial Refund to Wallet',
      type: 'keep'
    },
    {
      id: 'bank-keep',
      label: 'Keep Item & Partial Bank Transfer',
      type: 'keep'
    },
    {
      id: 'voucher-keep',
      label: 'Keep Item & Partial Store Voucher',
      type: 'keep'
    },
    {
      id: 'moneyback-keep',
      label: 'Keep Item & Partial Money Back',
      type: 'keep'
    }
  ];

  const handleSubmitNegotiation = () => {
    if (!selectedReason) {
      alert('Please select a reason for negotiation');
      return;
    }

    const selectedReasonData = negotiationReasons.find(r => r.id === selectedReason);
    
    if (selectedReasonData?.requiresMethod && !selectedMethod) {
      alert('Please select a refund method to suggest');
      return;
    }

    if (selectedReason === 'other' && !customDescription.trim()) {
      alert('Please provide a description for the negotiation');
      return;
    }

    // Determine next status based on action
    const nextStatus = selectedReasonData?.action === 'reject' ? 'rejected' : 'negotiation';
    
    console.log('Negotiation submitted:', {
      reason: selectedReason,
      method: selectedMethod,
      description: customDescription,
      nextStatus
    });

    // Call the status change handler
    handleStatusChange(nextStatus);
  };

  const selectedReasonData = negotiationReasons.find(r => r.id === selectedReason);
  const selectedMethodData = refundMethods.find(m => m.id === selectedMethod);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                #{refundDetails.refund}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Negotiation
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </p>
                <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                {refundDetails.customer.email && (
                  <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Order
                </p>
                <p className="font-medium text-sm">{refundDetails.order.order_id}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Customer's Preference
                </p>
                <p className="font-medium text-sm">{refundDetails.preferred_refund_method || 'Not specified'}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Requested Amount
                </p>
                <p className="font-medium text-sm">{formatCurrency(refundDetails.refund_amount)}</p>
              </div>
            </div>

            {/* Customer's Original Reason */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                Customer's Original Reason
              </p>
              <div className="bg-muted/10 p-3 rounded border text-sm">
                {refundDetails.reason}
              </div>
            </div>

            {/* Negotiation Form */}
            <div className="space-y-4">
              {/* Reason Dropdown */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-1">Select Reason *</p>
                <select 
                  value={selectedReason} 
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-2 text-sm border rounded-md"
                >
                  <option value="">Choose a negotiation reason</option>
                  {negotiationReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Dropdown (if required) */}
              {selectedReasonData?.requiresMethod && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">Suggest Preferred Method *</p>
                  <select 
                    value={selectedMethod} 
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full p-2 text-sm border rounded-md"
                  >
                    <option value="">Choose a refund method to suggest</option>
                    {/* Return Methods */}
                    <optgroup label="Return Items">
                      {refundMethods
                        .filter(method => method.type === 'return')
                        .map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.label}
                          </option>
                        ))}
                    </optgroup>
                    {/* Keep Items Methods */}
                    <optgroup label="Keep Items (Partial Refund)">
                      {refundMethods
                        .filter(method => method.type === 'keep')
                        .map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Custom Description for "Other" */}
              {selectedReason === 'other' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">Additional Description *</p>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Explain your concerns and what you're willing to offer..."
                    className="w-full p-2 text-sm border rounded-md min-h-[100px] resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    This will be sent to the customer as part of the negotiation message.
                  </p>
                </div>
              )}

              {/* Preview Letter */}
              {(selectedReason || selectedMethod) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-800 mb-2">Preview Message to Customer:</p>
                  <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                    <p className="mb-2">Dear {refundDetails.customer.name},</p>
                    
                    {selectedReason === 'reject_complete' ? (
                      <p>We regret to inform you that your refund request #{refundDetails.refund} has been rejected.</p>
                    ) : selectedReason === 'different_method' ? (
                      <div>
                        <p>We received your refund request #{refundDetails.refund} but cannot process it using your preferred method.</p>
                        <p className="mt-1">We suggest: <strong>{selectedMethodData?.label}</strong></p>
                      </div>
                    ) : selectedReason === 'partial_only' ? (
                      <div>
                        <p>We've reviewed your request #{refundDetails.refund} and suggest a partial refund instead.</p>
                        <p className="mt-1">We offer: <strong>{selectedMethodData?.label}</strong></p>
                      </div>
                    ) : selectedReason === 'return_required' ? (
                      <div>
                        <p>For request #{refundDetails.refund}, we require the item to be returned for any refund.</p>
                        <p className="mt-1">We suggest: <strong>{selectedMethodData?.label}</strong></p>
                      </div>
                    ) : selectedReason === 'other' ? (
                      <p>{customDescription || 'We have some concerns about your refund request and would like to discuss alternatives.'}</p>
                    ) : (
                      <p>We'd like to discuss alternative options for your refund request #{refundDetails.refund}.</p>
                    )}
                    
                    <p className="mt-2">Please respond within 48 hours to proceed with this negotiation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
                size="sm"
                onClick={() => handleStatusChange('pending')}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Review
              </Button>
              <Button
                onClick={handleSubmitNegotiation}
                disabled={!selectedReason || (selectedReasonData?.requiresMethod && !selectedMethod) || (selectedReason === 'other' && !customDescription.trim())}
                className={`flex-1 h-10 ${
                  selectedReason === 'reject_complete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                size="sm"
              >
                {selectedReason === 'reject_complete' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject Completely
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1.5" />
                    Send Negotiation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-medium">#{refundDetails.refund}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                Negotiation
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{refundDetails.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested Amount:</span>
              <span className="font-medium">{formatCurrency(refundDetails.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer's Method:</span>
              <span className="font-medium text-right">{refundDetails.preferred_refund_method || 'Not specified'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Negotiation Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
              <span>Be clear about what you can offer</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
              <span>Provide clear alternatives to rejection</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
              <span>Set reasonable deadlines (24-48 hours)</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
              <span>Consider partial solutions for minor issues</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => handleStatusChange('approved')}
            >
              <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
              Approve Instead
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => setSelectedReason('reject_complete')}
            >
              <XCircle className="h-3 w-3 mr-1.5 text-red-500" />
              Quick Reject
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              View Communication History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




function RejectedStatusUI({ refundDetails, formatDate, formatCurrency }: any) {
  const [rejectionDate] = useState<string>(new Date().toISOString());
  
  // Mock final rejection reason - in real app this would come from your data
  const finalRejectionReason = "Item shows signs of user damage and was returned outside the 30-day warranty period. The screen scratches appear to be caused by improper handling, not manufacturing defects.";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                #{refundDetails.refund}
              </CardTitle>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                Rejected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </p>
                <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                {refundDetails.customer.email && (
                  <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Order
                </p>
                <p className="font-medium text-sm">{refundDetails.order.order_id}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Rejection Date
                </p>
                <p className="font-medium text-sm">{formatDate(rejectionDate)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Requested Refund
                </p>
                <p className="font-medium text-sm">{formatCurrency(refundDetails.refund_amount)}</p>
              </div>
            </div>

            {/* Original Customer Reason */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                Customer's Original Reason
              </p>
              <div className="bg-muted/10 p-3 rounded border text-sm">
                {refundDetails.reason}
              </div>
            </div>

            {/* Final Rejection Reason */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Final Rejection Reason
              </p>
              <div className="bg-red-50 p-4 rounded border border-red-200">
                <p className="text-sm text-red-800 font-medium mb-1">Decision: Rejected</p>
                <p className="text-sm text-gray-700">{finalRejectionReason}</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-200">
                  <User className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Processed by Seller • {formatDate(rejectionDate)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-10"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Contact Customer
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                View Full Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-medium">#{refundDetails.refund}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                Rejected
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{refundDetails.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Amount:</span>
              <span className="font-medium">{formatCurrency(refundDetails.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rejection Date:</span>
              <span className="font-medium">{formatDate(rejectionDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Send Follow-up Email
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              Download Rejection Letter
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reopen Case
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Policy Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              <span>Warranty: 30 days from delivery</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              <span>User damage is not covered</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              <span>Original packaging required</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              <span>Evidence must be clear and relevant</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaitingStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState<string>('evidence.jpg');

  const attachments = refundDetails.attachments || [];

  const handleImagePreview = (attachment: { url: string; name: string }) => {
    setSelectedImage(attachment.url);
    setSelectedImageName(attachment.name || 'evidence.jpg');
    setShowImageModal(true);
  };

  const handleModalClose = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setSelectedImageName('evidence.jpg');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                #{refundDetails.refund}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Waiting for Return
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </p>
                <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                {refundDetails.customer.email && (
                  <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
                )}
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Order
                </p>
                <p className="font-medium text-sm">{refundDetails.order.order_id}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Return Tracking
                </p>
                <p className="font-medium text-sm">TRK-123456789 (J&T Express)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Estimated Delivery
                </p>
                <p className="font-medium text-sm">2024-02-05</p>
              </div>
            </div>

            {/* Compact Amount Display */}
            <div className="bg-muted/20 rounded p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Refund Amount</p>
              <p className="text-2xl font-bold flex items-center gap-1 text-green-700">
                <PhilippinePeso className="h-5 w-5" />
                {formatCurrency(refundDetails.refund_amount)}
              </p>
            </div>

            {/* Reason - Compact */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                Reason
              </p>
              <div className="bg-muted/10 p-3 rounded border text-sm">
                {refundDetails.reason}
              </div>
            </div>

            {/* Evidence - Smaller Thumbnails */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <ImageIcon className="h-3 w-3" />
                Evidence ({attachments.length})
              </p>

              <div className="grid grid-cols-4 gap-2 mb-3"> 
                {attachments.filter((a: any) => a.type === 'image').slice(0, 8).map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="relative cursor-pointer group"
                    onClick={() => handleImagePreview(attachment)} 
                  >
                    <div className="aspect-square rounded overflow-hidden border bg-muted/30"> 
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-medium">#{refundDetails.refund}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                Waiting Return
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{refundDetails.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(refundDetails.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Evidence:</span>
              <span className="font-medium">{attachments.length} files</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 h-10"
              onClick={() => handleStatusChange('to_process')}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Mark as Returned
            </Button>

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <p className="font-medium mb-0.5">Note:</p>
              <p className="text-xs">• Confirm item is received and verified</p>
              <p className="text-xs">• Check for damages or missing parts</p>
              <p className="text-xs">• Update tracking status if needed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => handleStatusChange('approved')}
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Approved
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <Package className="h-3 w-3 mr-1.5" />
              Update Tracking
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Customer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Image container */}
            <div className="relative h-[calc(90vh-80px)] flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt="Evidence preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleModalClose}
                className="bg-white hover:bg-gray-100 shadow-md"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600 truncate">
                {selectedImageName}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedImage, '_blank')}
              >
                Open in new tab
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add these imports at the top if not already there
import { Package } from 'lucide-react';

function ToProcessStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  // ... (Component body is the same as provided) ...
  return (
    <>
      <Alert className="mb-6 bg-blue-50 border-blue-200 border-l-4 border-l-blue-500">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <AlertTitle className="font-semibold text-blue-800">Ready to Process Refund</AlertTitle>
            <AlertDescription className="text-sm text-blue-700">
              Item has been verified/return skipped. Ready to process the refund payment.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{refundDetails.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount to Refund</p>
            <p className="text-2xl font-bold flex items-center gap-1 text-green-700">
              <PhilippinePeso className="h-6 w-6" />
              {formatCurrency(refundDetails.refund_amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Preferred Refund Method</p>
            <p className="font-medium">{refundDetails.preferred_refund_method || "Original Payment Method"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Target Completion</p>
            <p className="font-medium">3-5 Business Days</p>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-green-600 hover:bg-green-700 h-12"
        onClick={() => handleStatusChange('completed')}
        size="lg"
      >
        <CheckCircle className="h-5 w-5 mr-2" />
        Process Refund Now
      </Button>
    </>
  );
}

function CompletedStatusUI({ refundDetails, formatDate, formatCurrency, navigate  }: any) {
  // ... (Component body is the same as provided) ...
  return (
    <>
      <Alert className="mb-6 bg-green-50 border-green-200 border-l-4 border-l-green-500">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <AlertTitle className="font-semibold text-green-800">Refund Completed</AlertTitle>
            <AlertDescription className="text-sm text-green-700">
              This refund request has been **fully processed** and completed.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{refundDetails.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order</p>
              <p className="font-medium">{refundDetails.order.order_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Refunded</p>
              <p className="text-xl font-bold flex items-center gap-1 text-green-700">
                <PhilippinePeso className="h-5 w-5" />
                {formatCurrency(refundDetails.refund_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Date</p>
              <p className="font-medium">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <p className="text-sm text-muted-foreground">Method</p>
            <p className="font-medium">{refundDetails.preferred_refund_method}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="bg-green-100 text-green-800">Completed</Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );
}


// --- Status UI mapping (Unchanged) ---
const STATUS_UI_COMPONENTS = {
  pending: PendingStatusUI,
  approved: ApprovedStatusUI,
  rejected: RejectedStatusUI,
  waiting: WaitingStatusUI,
  to_process: ToProcessStatusUI,
  completed: CompletedStatusUI,
  negotiation: NegotiationStatusUI 
};

// --- Main Component ---
export default function ViewRefundRequest({ loaderData }: Route.ComponentProps) {
  const { user, refundDetails: initialRefundDetails } = loaderData;
  const params = useParams();
  const navigate = useNavigate();
  // Get status from URL query param for mock status changes
  const queryStatus = new URLSearchParams(window.location.search).get('status');
  
  // Use the status from the query parameter if available, otherwise use mock data's status
  const currentStatus = (queryStatus || initialRefundDetails.status) as keyof typeof STATUS_CONFIG;

  // Clone refundDetails and override status for mock state
  const refundDetails = {
    ...initialRefundDetails,
    status: currentStatus,
    refund: params.refundId // Ensure refund ID is correct from params
  };

  const refundId = refundDetails.refund;
  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig?.icon || Clock;

  // Get the status-specific UI component
  const StatusSpecificUI = STATUS_UI_COMPONENTS[currentStatus] || (() => 
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Unknown status: {currentStatus}</AlertDescription>
    </Alert>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    // Assuming amount is in centavos/smallest unit and converting to PHP
    const valueInPesos = amount / 100;
    return `₱${valueInPesos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };
  
  // Example: 45000 in centavos = ₱450.00
  // Note: The mock data has 45000, which usually means 450.00 or 45,000.00 depending on locale/standard.
  // I will assume 45000 means ₱45,000.00 for the sake of a high-value item refund.

  const handleStatusChange = (newStatus: string) => {
    console.log(`Changing status for refund ${refundId} to: ${newStatus}`);
    // Simulate navigation to the new status view
    const newUrl = `/view-refund-request/${refundId}?status=${newStatus}`;
    navigate(newUrl); // Use navigate for state-based change simulation
  };

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            // Use navigate(-1) to go back in React Router history
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to Refunds List</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Header with Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Refund Request</h1>
              <p className="text-muted-foreground">Request ID: **#{refundDetails.refund}**</p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            variant="secondary"
            className={`text-sm px-3 py-1.5 ${statusConfig?.color}`}
          >
            <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
            {statusConfig?.label}
          </Badge>
        </div>

        {/* Status-Specific UI Section */}
        <StatusSpecificUI
          refundDetails={refundDetails}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          handleStatusChange={handleStatusChange}
        />
      </div>
    </UserProvider>
  );
}