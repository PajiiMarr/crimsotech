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
  Shield,
  RotateCcw,
  Truck,
  PackageCheck,
  CheckSquare,
  Search,
  AlertTriangle,
  BarChart,
  Eye,
  FileWarning,



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
  Send,
  DollarSign, 
  Wallet, 
  Tag, 
  RefreshCw, 
  Banknote, 
  MessageSquare,
  X, 
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
  const [trackingNumber, setTrackingNumber] = useState('TRK-123456789');
  const [carrier, setCarrier] = useState('J&T Express');
  const [estimatedDelivery, setEstimatedDelivery] = useState('2024-02-05');

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
            {/* Tracking Information */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-800">Return Tracking</h3>
                  <p className="text-sm text-blue-600">Item is on its way back to you</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-blue-700">Tracking Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-sm">{trackingNumber}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => navigator.clipboard.writeText(trackingNumber)}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-blue-700">Carrier</p>
                  <p className="font-medium text-sm">{carrier}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-blue-700">Estimated Delivery</p>
                  <p className="font-medium text-sm">{estimatedDelivery}</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-blue-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => window.open(`https://tracking.com/${trackingNumber}`, '_blank')}
                >
                  <Truck className="h-3.5 w-3.5 mr-1.5" />
                  Track Package
                </Button>
              </div>
            </div>

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
                  Return Initiated
                </p>
                <p className="font-medium text-sm">{formatDate(new Date().toISOString())}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Refund Method
                </p>
                <p className="font-medium text-sm">{refundDetails.preferred_refund_method}</p>
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

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
                size="sm"
                onClick={() => handleStatusChange('approved')}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Approved
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                size="sm"
                onClick={() => handleStatusChange('to_verify')}
              >
                <PackageCheck className="h-4 w-4 mr-1.5" />
                Mark as Received
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
              <span className="text-muted-foreground">Tracking:</span>
              <span className="font-medium text-blue-600">Active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Return Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Include all original accessories</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Use original packaging if possible</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Include return authorization slip</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Ship within 7 days of approval</span>
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
              <Truck className="h-3 w-3 mr-1.5" />
              Update Tracking Info
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
              View Return Label
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="relative h-[calc(90vh-80px)] flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt="Evidence preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
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


function ToVerifyStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [itemCondition, setItemCondition] = useState('good');
  const [isComplete, setIsComplete] = useState(true);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');

  const handleVerificationSubmit = () => {
    if (!verificationNotes.trim()) {
      alert('Please add verification notes');
      return;
    }

    console.log('Verification submitted:', {
      condition: itemCondition,
      isComplete,
      hasDamage,
      damageDescription,
      notes: verificationNotes
    });

    // Move to next status based on verification
    if (hasDamage) {
      // If damaged, go to dispute or negotiation
      const shouldDispute = confirm('Item has damage. Do you want to file a dispute instead?');
      if (shouldDispute) {
        handleStatusChange('dispute');
      } else {
        handleStatusChange('negotiation');
      }
    } else {
      // If good condition, proceed to processing
      handleStatusChange('to_process');
    }
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
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                <PackageCheck className="h-3 w-3 mr-1" />
                To Verify
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verification Alert */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTitle className="text-orange-800 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Item Received - Verification Required
              </AlertTitle>
              <AlertDescription className="text-orange-700 text-sm">
                The returned item has been received. Please verify its condition and completeness before proceeding with the refund.
              </AlertDescription>
            </Alert>

            {/* Verification Form */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Item Condition</p>
                <div className="grid grid-cols-3 gap-2">
                  {['excellent', 'good', 'poor'].map((condition) => (
                    <Button
                      key={condition}
                      type="button"
                      variant={itemCondition === condition ? 'default' : 'outline'}
                      className={`capitalize ${itemCondition === condition ? 'bg-blue-600' : ''}`}
                      onClick={() => setItemCondition(condition)}
                    >
                      {condition}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Item Completeness</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={isComplete}
                      onChange={() => setIsComplete(true)}
                      className="h-4 w-4"
                    />
                    <span>All accessories included</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!isComplete}
                      onChange={() => setIsComplete(false)}
                      className="h-4 w-4"
                    />
                    <span>Missing items</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={hasDamage}
                    onChange={(e) => setHasDamage(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">Item has damage</span>
                </label>
                
                {hasDamage && (
                  <textarea
                    placeholder="Describe the damage..."
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm min-h-[80px]"
                  />
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Verification Notes *</p>
                <textarea
                  placeholder="Add verification notes (required)..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm min-h-[100px]"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-10"
                size="sm"
                onClick={() => handleStatusChange('waiting')}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Waiting
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                size="sm"
                onClick={handleVerificationSubmit}
                disabled={!verificationNotes.trim()}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Complete Verification
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
              <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                To Verify
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
              <span className="text-muted-foreground">Received:</span>
              <span className="font-medium text-green-600">Yes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verification Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Verify item matches original product</span>
            </div>
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Check for physical damage</span>
            </div>
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Confirm all accessories included</span>
            </div>
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Test functionality if applicable</span>
            </div>
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Check serial numbers match</span>
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
              className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700"
              onClick={() => handleStatusChange('dispute')}
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              Flag as Damaged
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <ImageIcon className="h-3 w-3 mr-1.5" />
              Upload Inspection Photos
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Request More Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





function DisputeStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange, navigate }: any) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState<string>('evidence.jpg');
  
  const attachments = refundDetails.attachments || [];
  
  // Mock dispute data 
  const disputeDetails = {
    id: 'DSP-2024-001',
    filed_by: 'Buyer',
    filed_by_name: refundDetails.customer.name,
    filed_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    reason: 'Unfair rejection - item meets refund criteria',
    description: 'The seller rejected my refund request unfairly. The item is clearly defective as shown in my evidence. I request admin review and full refund as per platform policy.',
    status: 'pending_review', // pending_review, under_review, resolved
    admin_decision: null, // approved, rejected, partial
    admin_response: null,
    admin_response_date: null,
    evidence_count: 3
  };

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

  const getStatusBadge = () => {
    switch (disputeDetails.status) {
      case 'pending_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Admin Review</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800">Under Admin Review</Badge>;
      case 'resolved':
        if (disputeDetails.admin_decision === 'approved') {
          return <Badge className="bg-green-100 text-green-800">Dispute Approved</Badge>;
        } else if (disputeDetails.admin_decision === 'rejected') {
          return <Badge className="bg-red-100 text-red-800">Dispute Rejected</Badge>;
        } else {
          return <Badge className="bg-yellow-100 text-yellow-800">Partially Resolved</Badge>;
        }
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <CardTitle className="text-base">
                  #{refundDetails.refund} - Buyer Dispute
                </CardTitle>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dispute Header */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Buyer Filed Dispute</AlertTitle>
              <AlertDescription className="text-orange-700">
                The buyer has disputed your rejection of their refund request. This is now under admin review.
              </AlertDescription>
            </Alert>

            {/* Dispute Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Filed By</p>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">{disputeDetails.filed_by_name}</p>
                      <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                        Buyer
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Filed Date</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="font-medium">{formatDate(disputeDetails.filed_date)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Dispute Reason</p>
                <div className="bg-red-50 p-3 rounded border border-red-100">
                  <p className="font-medium text-sm text-red-800">{disputeDetails.reason}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer's Statement</p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm text-gray-700">{disputeDetails.description}</p>
                </div>
              </div>
            </div>

            {/* Buyer's Evidence */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <ImageIcon className="h-3 w-3" />
                Buyer's Evidence ({disputeDetails.evidence_count} files)
              </p>

              <div className="grid grid-cols-4 gap-2 mb-3"> 
                {attachments.slice(0, 4).map((attachment: any, index: number) => (
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
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                      {attachment.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Response (if available) */}
            {disputeDetails.admin_response && (
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin Response
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Decision: {disputeDetails.admin_decision}</p>
                      <p className="text-xs text-blue-700">
                        {disputeDetails.admin_response_date && formatDate(disputeDetails.admin_response_date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{disputeDetails.admin_response}</p>
                </div>
              </div>
            )}

            {/* Action Button - File Counter Dispute */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Need to file your own dispute?</p>
              <p className="text-xs text-gray-500 mb-3">
                If you have additional evidence or information that wasn't considered in the original review, you can file a counter dispute.
              </p>
              <Button
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 h-10"
                size="sm"
                onClick={() => navigate(`/file-counter-dispute/${refundDetails.refund}`)}
              >
                <FileWarning className="h-4 w-4 mr-1.5" />
                File Counter Dispute
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        {/* Dispute Summary */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dispute Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispute ID:</span>
              <span className="font-medium">{disputeDetails.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Request:</span>
              <span className="font-medium">#{refundDetails.refund}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge()}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filed By:</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                Buyer
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filed Date:</span>
              <span className="font-medium">{formatDate(disputeDetails.filed_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Evidence:</span>
              <span className="font-medium">{disputeDetails.evidence_count} files</span>
            </div>
          </CardContent>
        </Card>

        {/* Original Refund Details */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Original Refund Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{refundDetails.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(refundDetails.refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-medium text-right">{refundDetails.preferred_refund_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Decision:</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                Rejected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dispute Timeline */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dispute Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div>
                <p className="font-medium">Refund Rejected</p>
                <p className="text-gray-500">{formatDate(refundDetails.requested_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div>
                <p className="font-medium">Buyer Filed Dispute</p>
                <p className="text-gray-500">{formatDate(disputeDetails.filed_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                disputeDetails.status !== 'pending_review' ? 'bg-blue-500' : 'bg-gray-300'
              }`}></div>
              <div>
                <p className={`font-medium ${
                  disputeDetails.status !== 'pending_review' ? '' : 'text-gray-400'
                }`}>Admin Review</p>
                <p className="text-gray-500">24-48 hours</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                disputeDetails.status === 'resolved' ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <div>
                <p className={`font-medium ${
                  disputeDetails.status === 'resolved' ? '' : 'text-gray-400'
                }`}>Final Decision</p>
                <p className="text-gray-500">Binding resolution</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => handleStatusChange('rejected')}
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Rejection Details
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/customer/${refundDetails.customer.name}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Buyer
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              View Dispute Policy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="relative h-[calc(90vh-80px)] flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt="Evidence preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
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




function ToProcessStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  
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
  negotiation: NegotiationStatusUI,
  waiting: WaitingStatusUI,
  to_verify: ToVerifyStatusUI,
  to_process: ToProcessStatusUI,
  dispute: DisputeStatusUI,
  completed: CompletedStatusUI

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
   
    const valueInPesos = amount / 100;
    return `₱${valueInPesos.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };
  
  const handleStatusChange = (newStatus: string) => {
    console.log(`Changing status for refund ${refundId} to: ${newStatus}`);
  
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