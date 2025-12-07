// pages/process-return-item.tsx
"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Truck,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  Shield,
  MapPin,
  ArrowLeft,
  ChevronRight,
  Upload,
  FileText,
  X,
  Copy,
  Printer,
  Phone,
  Mail,
  Check,
  Download
} from 'lucide-react';

// Shadcn Components
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import Breadcrumbs from '~/components/ui/breadcrumbs';

// --- Policy Section Component ---
const PolicySection: React.FC = () => (
  <Card className="h-fit sticky top-6">
    <CardContent className="p-6">
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Tracking & Verification
        </h2>
        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Tracking Requirements</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Submit tracking information within 24 hours of shipping</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use a trackable shipping method</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Keep shipping receipt until refund is received</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Verification Process</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Item inspection: 1-2 business days after receipt</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Refund processing: 24 hours after verification</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>Delays may occur if item condition doesn't match description</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Need Help?</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>tracking@ecommerce.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+63 912 345 6789</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Mock Data ---
const returnInfo = {
  orderId: 'ORD-789012',
  returnId: 'RET-456789',
  itemName: 'Tufflow 2GB RAM 32GB ROM',
  returnAddress: 'Purok 8, Eme Street, Ayala, Zamboanga City',
  deadline: '2025-04-14',
  refundMethod: 'E-Wallet (GCash)',
  refundAmount: 300.00
};

// --- Courier Options ---
const courierOptions = [
  'LBC Express',
  'J&T Express',
  '2GO',
  'Air21',
  'DHL',
  'FedEx',
  'UPS',
  'Philippine Postal (PhilPost)',
  'Other'
];

// --- Tracking Form Component ---
const TrackingForm: React.FC<{
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}> = ({ onSubmit, isSubmitting }) => {
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [otherCourier, setOtherCourier] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      courier: courier === 'Other' ? otherCourier : courier,
      trackingNumber,
      shippingDate,
      estimatedDelivery,
      shippingCost,
      notes,
      receiptImage
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Courier Selection */}
      <div className="space-y-3">
        <Label htmlFor="courier" className="text-lg font-semibold">
          Courier Service *
        </Label>
        <Select value={courier} onValueChange={setCourier}>
          <SelectTrigger id="courier">
            <SelectValue placeholder="Select courier service" />
          </SelectTrigger>
          <SelectContent>
            {courierOptions.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {courier === 'Other' && (
          <div className="mt-2">
            <Label htmlFor="otherCourier">Specify Courier Name *</Label>
            <Input
              id="otherCourier"
              value={otherCourier}
              onChange={(e) => setOtherCourier(e.target.value)}
              placeholder="Enter courier name"
            />
          </div>
        )}
      </div>

      {/* Tracking Number */}
      <div className="space-y-3">
        <Label htmlFor="trackingNumber" className="text-lg font-semibold">
          Tracking Number *
        </Label>
        <Input
          id="trackingNumber"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          required
        />
        <p className="text-sm text-gray-500">
          This is usually a combination of letters and numbers provided by the courier.
        </p>
      </div>

      {/* Shipping Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label htmlFor="shippingDate">Shipping Date *</Label>
          <Input
            id="shippingDate"
            type="date"
            value={shippingDate}
            onChange={(e) => setShippingDate(e.target.value)}
            max={today}
            required
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="estimatedDelivery">Estimated Delivery Date</Label>
          <Input
            id="estimatedDelivery"
            type="date"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            min={shippingDate}
          />
        </div>
      </div>

      {/* Shipping Cost */}
      <div className="space-y-3">
        <Label htmlFor="shippingCost">Shipping Cost (Optional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
          <Input
            id="shippingCost"
            type="number"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            className="pl-8"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
        <p className="text-sm text-gray-500">
          For your reference only. Original shipping costs are not refundable.
        </p>
      </div>

      {/* Receipt Upload */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Shipping Receipt (Optional)
        </Label>
        <p className="text-sm text-gray-500">
          Upload a photo of your shipping receipt for reference. Max 5MB.
        </p>
        
        {receiptImage ? (
          <div className="relative">
            <div className="w-48 h-48 rounded-lg border overflow-hidden">
              <img
                src={receiptImage}
                alt="Shipping receipt"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setReceiptImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors">
              <Upload className="w-8 h-8 mb-2" />
              <span>Click to upload shipping receipt</span>
              <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
            </div>
          </label>
        )}
      </div>

      {/* Additional Notes */}
      <div className="space-y-3">
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information about your shipment..."
          rows={3}
        />
      </div>

      {/* Terms Checkbox */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="confirmation"
            required
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
          />
          <div>
            <Label htmlFor="confirmation" className="font-semibold">
              Confirmation
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              I confirm that I have shipped the item to the return address and the tracking information provided is accurate.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!courier || !trackingNumber || !shippingDate || isSubmitting}
        className="w-full py-6 text-lg"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Submitting Tracking Information...
          </>
        ) : (
          <>
            Submit Tracking Information
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
};

// --- Return Summary Component ---
const ReturnSummary: React.FC = () => (
  <Card className="border-green-100 bg-green-50">
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Return Summary</h3>
          </div>
          <Badge className="bg-green-100 text-green-700">In Progress</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Number</p>
            <p className="font-semibold">{returnInfo.orderId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Return ID</p>
            <p className="font-semibold">{returnInfo.returnId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Item</p>
            <p className="font-semibold">{returnInfo.itemName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Refund Amount</p>
            <p className="font-semibold">₱{returnInfo.refundAmount.toFixed(2)}</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Return Deadline</span>
            <span className="font-semibold text-amber-600">{returnInfo.deadline}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Refund Method</span>
            <span className="font-semibold">{returnInfo.refundMethod}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Return Address Component ---
const ReturnAddressDisplay: React.FC = () => (
  <Card className="border-blue-100">
    <CardContent className="p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Return Shipping Address</h3>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-mono text-sm">{returnInfo.returnAddress}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Order #: <strong>{returnInfo.orderId}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Return ID: <strong>{returnInfo.returnId}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Important Notes Component ---
const ImportantNotes: React.FC = () => (
  <Alert className="bg-amber-50 border-amber-200">
    <AlertCircle className="w-5 h-5 text-amber-600" />
    <AlertDescription className="text-amber-800">
      <div className="font-semibold">Important:</div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>• Submit tracking information within 24 hours of shipping</li>
        <li>• Keep your shipping receipt until refund is processed</li>
        <li>• Refund will be processed 1-2 business days after we receive the item</li>
        <li>• Contact support if you need to update tracking information</li>
      </ul>
    </AlertDescription>
  </Alert>
);

// --- Main Component ---
export default function ProcessReturnItemPage() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleSubmitTracking = (data: any) => {
    setIsSubmitting(true);
    
    // Simulate API submission
    setTimeout(() => {
      console.log('Tracking data submitted:', data);
      setTrackingData(data);
      setIsSubmitted(true);
      setIsSubmitting(false);
    }, 2000);
  };

  if (isSubmitted) {
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
              <span className="font-semibold">Back</span>
            </Button>
            <Breadcrumbs />
          </div>

          <Separator />

          {/* Success Message */}
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Tracking Information Submitted!
            </h1>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Your tracking information has been received. We'll notify you when we receive the item.
            </p>
            
            {/* Tracking Details */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tracking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Courier</p>
                      <p className="font-semibold">{trackingData.courier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-semibold font-mono">{trackingData.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shipping Date</p>
                      <p className="font-semibold">{trackingData.shippingDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Submission Date</p>
                      <p className="font-semibold">{new Date().toISOString().split('T')[0]}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <div className="max-w-2xl mx-auto mt-8 space-y-4">
              <h3 className="font-semibold text-lg">What Happens Next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-sm">Item in Transit</h4>
                    <p className="text-xs text-gray-600 mt-1">Track your package using the courier's website</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-sm">Verification</h4>
                    <p className="text-xs text-gray-600 mt-1">We'll inspect the item (1-2 business days)</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <Check className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-sm">Refund Processing</h4>
                    <p className="text-xs text-gray-600 mt-1">Refund sent to your e-wallet within 24 hours</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="max-w-md mx-auto mt-8 space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full"
              >
                Return to Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Confirmation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="font-semibold">Back to Return Instructions</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Submit Tracking Information
          </h1>
          <p className="text-gray-600">
            Provide tracking details for your return shipment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Policy */}
          <div className="lg:col-span-1">
            <PolicySection />
          </div>

          {/* Right Column: Tracking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Return Summary */}
            <ReturnSummary />

            {/* Return Address */}
            <ReturnAddressDisplay />

            {/* Important Notes */}
            <ImportantNotes />

            {/* Tracking Form */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold">Tracking Information</h2>
                  </div>
                  <p className="text-gray-600">
                    Fill out the form below with your shipment details. This information helps us track your return.
                  </p>
                  
                  <Separator />
                  
                  <TrackingForm 
                    onSubmit={handleSubmitTracking}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Need Help Finding Your Tracking Number?
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Check Your Receipt</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          The tracking number is usually printed on the shipping receipt provided by the courier.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-green-600">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Email Confirmation</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Check your email for a confirmation from the courier service.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-purple-600">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Courier's Website</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Log into the courier's website or app to find your tracking information.
                        </p>
                      </div>
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