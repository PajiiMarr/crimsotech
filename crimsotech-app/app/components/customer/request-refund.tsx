// pages/request-refund.tsx
"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { 
  ShoppingBag, 
  CheckCircle, 
  Info, 
  Upload, 
  PhilippinePeso, 
  ArrowLeft,
  CreditCard,
  Wallet,
  RefreshCw,
  AlertCircle,
  Package,
  Shield,
  Truck,
  Calendar,
  Banknote,
  X,
  Bell,
  Mail,
  Clock,
  Check,
  XCircle,
  FileText,
  Tag,
  AlertTriangle,
  Home,
  Phone,
  MapPin,
  Download,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// Shadcn Components
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import Breadcrumbs from '~/components/ui/breadcrumbs';
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

// --- Type Definitions ---
interface ItemDetails {
  name: string;
  specs: string;
  price: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed' | 'Cancelled';
  date: string;
  imageSrc: string;
  shopName: string;
  orderId: string;
  purchaseDate: string;
  deliveryDate: string;
}

interface EWalletDetails {
  provider: string;
  accountName: string;
  accountNumber: string;
  contactNumber: string;
}

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  branch: string;
}

interface RemittanceDetails {
  provider: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  contactNumber: string;
  validIdType: string;
  validIdNumber: string;
}

interface RefundMethod {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  type: 'return' | 'keep';
  subType: 'wallet' | 'bank' | 'voucher' | 'replace' | 'moneyback';
}

// --- Mock Data ---
const mockItem: ItemDetails = {
  name: 'Tufflow 2GB RAM 32GB ROM',
  specs: 'Space Gray | 2GB RAM | 32GB Storage',
  price: 300.00,
  status: 'Pending',
  date: 'April 06, 2025',
  imageSrc: '/placeholder-image.jpg',
  shopName: 'Mamen Shop',
  orderId: 'ORD-789012',
  purchaseDate: 'April 01, 2025',
  deliveryDate: 'April 04, 2025'
};

// --- Policy Section Component ---
const PolicySection: React.FC = () => (
  <Card className="h-fit sticky top-6">
    <CardContent className="p-6">
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Refund & Return Items Policy
        </h2>
        <Separator />

        {/* Eligibility */}
        <div className="space-y-3">
          <h3 className="flex items-center text-lg font-semibold text-gray-700">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500" /> Eligibility
          </h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Items must be returned within <strong>7 calendar days</strong> of delivery.</li>
            <li>Only products marked as <strong>Refundable or Returnable</strong> are eligible.</li>
            <li>Items must be in original condition, unless the return is due to defect, damage, or misrepresentation.</li>
            <li>Products sold marked <strong>"non-returnable"</strong> are excluded from this policy.</li>
          </ul>
        </div>
        <Separator />

        {/* Refund Conditions */}
        <div className="space-y-3">
          <h3 className="flex items-center text-lg font-semibold text-gray-700">
            <PhilippinePeso className="w-5 h-5 mr-2 text-blue-500" /> Refund Conditions
          </h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Refunds are issued after item verification by the seller.</li>
            <li>Processing time: 3-7 business days after verification.</li>
            <li>Partial refunds may apply if the item shows signs of use or damage not covered by the complaint.</li>
            <li>Original shipping fees are non-refundable unless the return is due to seller error.</li>
          </ul>
        </div>
        <Separator />

        {/* Return Process */}
        <div className="space-y-3">
          <h3 className="flex items-center text-lg font-semibold text-gray-700">
            <Truck className="w-5 h-5 mr-2 text-yellow-500" /> Return Process
          </h3>
          <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2">
            <li>Submit a Return Request via your <strong>Refund & Return Items</strong> tab.</li>
            <li>Wait for system approval (1-2 business days).</li>
            <li>Receive return instructions and prepaid shipping label (if applicable).</li>
            <li>Return the item within <strong>5-7 calendar days</strong> of approval.</li>
            <li>Upload tracking number or proof of shipment.</li>
            <li>Wait for verification and refund processing.</li>
          </ol>
        </div>

        {/* Contact Information */}
        <div className="space-y-3 pt-4">
          <h3 className="flex items-center text-lg font-semibold text-gray-700">
            <Info className="w-5 h-5 mr-2 text-purple-500" /> Need Help?
          </h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Contact our support team:</p>
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
    </CardContent>
  </Card>
);

// --- Item Card Component ---
const ItemCard: React.FC<{ item: ItemDetails }> = ({ item }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{item.shopName}</CardTitle>
          <span className="text-xs text-gray-500">Order: {item.orderId}</span>
        </div>
        <span className="text-base font-bold text-gray-800">₱{item.price.toFixed(2)}</span>
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-4">
          {/* Image Placeholder */}
          <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-800 mt-1">{item.name}</p>
                <p className="text-xs text-gray-500">{item.specs}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Purchase: {item.purchaseDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                <span>Delivery: {item.deliveryDate}</span>
              </div>
            </div>
            
  
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Refund Methods Data ---
const refundMethods: RefundMethod[] = [
  {
    id: 'wallet-return',
    label: 'Return Item & Refund to Wallet',
    description: 'Return the item and get refund to your e-wallet (GCash, PayMaya, etc.)',
    icon: Wallet,
    type: 'return',
    subType: 'wallet'
  },
  {
    id: 'bank-return',
    label: 'Return Item & Bank Transfer',
    description: 'Return the item and get refund via bank transfer',
    icon: CreditCard,
    type: 'return',
    subType: 'bank'
  },
  {
    id: 'voucher-return',
    label: 'Return Item & Store Voucher',
    description: 'Return the item and receive a store voucher',
    icon: Tag,
    type: 'return',
    subType: 'voucher'
  },
  {
    id: 'replace',
    label: 'Return & Replacement',
    description: 'Return the item and get a replacement',
    icon: RefreshCw,
    type: 'return',
    subType: 'replace'
  },
  {
    id: 'moneyback-return',
    label: 'Return Item & Money Back',
    description: 'Return the item and get cash via remittance',
    icon: Banknote,
    type: 'return',
    subType: 'moneyback'
  },
  {
    id: 'wallet-keep',
    label: 'Keep Item & Partial Refund to Wallet',
    description: 'Keep the item and get partial refund to e-wallet',
    icon: Wallet,
    type: 'keep',
    subType: 'wallet'
  },
  {
    id: 'bank-keep',
    label: 'Keep Item & Partial Bank Transfer',
    description: 'Keep the item and get partial refund via bank',
    icon: CreditCard,
    type: 'keep',
    subType: 'bank'
  },
  {
    id: 'voucher-keep',
    label: 'Keep Item & Partial Store Voucher',
    description: 'Keep the item and get partial store voucher',
    icon: Tag,
    type: 'keep',
    subType: 'voucher'
  },
  {
    id: 'moneyback-keep',
    label: 'Keep Item & Partial Money Back',
    description: 'Keep the item and get partial cash via remittance',
    icon: Banknote,
    type: 'keep',
    subType: 'moneyback'
  }
];

// --- Method Dropdown Item Component ---
const MethodItem: React.FC<{ method: RefundMethod }> = ({ method }) => {
  const Icon = method.icon;
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{method.label}</span>
          <Badge
            variant={method.type === 'return' ? 'default' : 'secondary'}
            className="ml-2"
          >
            {method.type === 'return' ? 'Return Item' : 'Keep Item'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">{method.description}</p>
      </div>
    </div>
  );
};

// --- E-Wallet Form Component ---
const EWalletForm: React.FC<{
  details: EWalletDetails;
  onChange: (details: EWalletDetails) => void;
}> = ({ details, onChange }) => {
  const eWalletProviders = [
    "GCash",
    "PayMaya",
    "GrabPay",
    "Coins.ph",
    "Other"
  ];

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
      <h4 className="font-semibold text-blue-800 flex items-center gap-2">
        <Wallet className="w-4 h-4" />
        E-Wallet Details
      </h4>
      
      <Alert className="bg-blue-50 border-blue-200">
        <Bell className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Refunds will be sent to this e-wallet. Ensure details are correct.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eWalletProvider">E-Wallet Provider *</Label>
          <Select
            value={details.provider}
            onValueChange={(value) => onChange({ ...details, provider: value })}
          >
            <SelectTrigger id="eWalletProvider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {eWalletProviders.map(provider => (
                <SelectItem key={provider} value={provider.toLowerCase()}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number *</Label>
          <Input
            id="accountNumber"
            value={details.accountNumber}
            onChange={(e) => onChange({ ...details, accountNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountName">Account Name *</Label>
          <Input
            id="accountName"
            value={details.accountName}
            onChange={(e) => onChange({ ...details, accountName: e.target.value })}
            placeholder="As it appears in the app"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contactNumber">Contact Number *</Label>
          <Input
            id="contactNumber"
            value={details.contactNumber}
            onChange={(e) => onChange({ ...details, contactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
        </div>
      </div>
      
      {details.provider === 'other' && (
        <div className="space-y-2">
          <Label htmlFor="otherProvider">Specify Provider</Label>
          <Input
            id="otherProvider"
            placeholder="Enter e-wallet provider name"
          />
        </div>
      )}
    </div>
  );
};

// --- Bank Transfer Form Component ---
const BankTransferForm: React.FC<{
  details: BankDetails;
  onChange: (details: BankDetails) => void;
}> = ({ details, onChange }) => {
  const bankList = [
    "BDO (Banco de Oro)",
    "BPI (Bank of the Philippine Islands)",
    "Metrobank",
    "Landbank",
    "UnionBank",
    "Security Bank",
    "PNB (Philippine National Bank)",
    "RCBC",
    "China Bank",
    "Other"
  ];

  const accountTypes = ["Savings", "Checking", "Current"];

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
      <h4 className="font-semibold text-green-800 flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Bank Account Details
      </h4>
      
      <Alert className="bg-green-50 border-green-200">
        <Bell className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Refunds will be transferred to this bank account. Processing may take 3-5 business days.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name *</Label>
          <Select
            value={details.bankName}
            onValueChange={(value) => onChange({ ...details, bankName: value })}
          >
            <SelectTrigger id="bankName">
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {bankList.map(bank => (
                <SelectItem key={bank} value={bank.toLowerCase()}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number *</Label>
          <Input
            id="accountNumber"
            value={details.accountNumber}
            onChange={(e) => onChange({ ...details, accountNumber: e.target.value })}
            placeholder="000-000-000"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountName">Account Name *</Label>
          <Input
            id="accountName"
            value={details.accountName}
            onChange={(e) => onChange({ ...details, accountName: e.target.value })}
            placeholder="As it appears in bank records"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="accountType">Account Type *</Label>
          <Select
            value={details.accountType}
            onValueChange={(value) => onChange({ ...details, accountType: value })}
          >
            <SelectTrigger id="accountType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map(type => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            value={details.branch}
            onChange={(e) => onChange({ ...details, branch: e.target.value })}
            placeholder="Bank branch location"
          />
        </div>
      </div>
    </div>
  );
};

// --- Remittance Form Component ---
const RemittanceForm: React.FC<{
  details: RemittanceDetails;
  onChange: (details: RemittanceDetails) => void;
}> = ({ details, onChange }) => {
  const remittanceProviders = [
    "Palawan Express",
    "LBC",
    "Cebuana Lhuillier",
    "M Lhuillier",
    "Western Union",
    "MoneyGram",
    "Other"
  ];

  const validIdTypes = [
    "Driver's License",
    "Passport",
    "SSS ID",
    "GSIS ID",
    "PRC ID",
    "Voter's ID",
    "Postal ID",
    "TIN ID",
    "PhilHealth ID",
    "Company ID",
    "School ID",
    "Other Government ID"
  ];

  return (
    <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
      <h4 className="font-semibold text-amber-800 flex items-center gap-2">
        <Banknote className="w-4 h-4" />
        Remittance Details
      </h4>
      
      <Alert className="bg-amber-50 border-amber-200">
        <Bell className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          Money back will be sent via remittance. You'll receive a notification when ready for pickup.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="remittanceProvider">Remittance Provider *</Label>
          <Select
            value={details.provider}
            onValueChange={(value) => onChange({ ...details, provider: value })}
          >
            <SelectTrigger id="remittanceProvider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {remittanceProviders.map(provider => (
                <SelectItem key={provider} value={provider.toLowerCase()}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="validIdType">Valid ID Type *</Label>
          <Select
            value={details.validIdType}
            onValueChange={(value) => onChange({ ...details, validIdType: value })}
          >
            <SelectTrigger id="validIdType">
              <SelectValue placeholder="Select ID type" />
            </SelectTrigger>
            <SelectContent>
              {validIdTypes.map(idType => (
                <SelectItem key={idType} value={idType.toLowerCase()}>
                  {idType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="validIdNumber">Valid ID Number *</Label>
          <Input
            id="validIdNumber"
            value={details.validIdNumber}
            onChange={(e) => onChange({ ...details, validIdNumber: e.target.value })}
            placeholder="ID number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="contactNumber">Contact Number *</Label>
          <Input
            id="contactNumber"
            value={details.contactNumber}
            onChange={(e) => onChange({ ...details, contactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={details.firstName}
            onChange={(e) => onChange({ ...details, firstName: e.target.value })}
            placeholder="Given name"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={details.lastName}
            onChange={(e) => onChange({ ...details, lastName: e.target.value })}
            placeholder="Surname"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="address">Complete Address *</Label>
          <Input
            id="address"
            value={details.address}
            onChange={(e) => onChange({ ...details, address: e.target.value })}
            placeholder="Street, Barangay"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">City/Municipality *</Label>
          <Input
            id="city"
            value={details.city}
            onChange={(e) => onChange({ ...details, city: e.target.value })}
            placeholder="City"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="province">Province *</Label>
          <Input
            id="province"
            value={details.province}
            onChange={(e) => onChange({ ...details, province: e.target.value })}
            placeholder="Province"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            value={details.zipCode}
            onChange={(e) => onChange({ ...details, zipCode: e.target.value })}
            placeholder="0000"
          />
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function RequestRefundPage() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [partialAmount, setPartialAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for payment method details
  const [eWalletDetails, setEWalletDetails] = useState<EWalletDetails>({
    provider: '',
    accountName: '',
    accountNumber: '',
    contactNumber: ''
  });
  
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: '',
    branch: ''
  });
  
  const [remittanceDetails, setRemittanceDetails] = useState<RemittanceDetails>({
    provider: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    contactNumber: '',
    validIdType: '',
    validIdNumber: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && images.length + files.length <= 4) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages([...images, ...newImages]);
    }
  };

  const handleImageRemove = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Get payment method details based on selection
    let paymentDetails = {};
    if (selectedMethod.includes('wallet')) {
      paymentDetails = eWalletDetails;
    } else if (selectedMethod.includes('bank')) {
      paymentDetails = bankDetails;
    } else if (selectedMethod.includes('moneyback')) {
      paymentDetails = remittanceDetails;
    }
    
    // Prepare refund data
    const refundData = {
      orderId: mockItem.orderId,
      itemName: mockItem.name,
      itemPrice: mockItem.price,
      method: selectedMethod,
      methodLabel: refundMethods.find(m => m.id === selectedMethod)?.label || '',
      reason,
      images,
      partialAmount: selectedMethod.includes('keep') ? parseFloat(partialAmount) : null,
      paymentDetails,
      submittedDate: new Date().toISOString().split('T')[0],
      shopName: mockItem.shopName
    };
    
    console.log('Refund request submitted:', refundData);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Navigate to decision page with submitted data
      navigate('/decision/:id', { 
        state: { 
          ...refundData,
          status: 'pending', // For demo purposes
          orderDetails: mockItem
        } 
      });
    }, 2000);
  };

  const selectedMethodData = refundMethods.find(m => m.id === selectedMethod);
  const showPartialAmount = selectedMethod.includes('keep');
  const maxPartialAmount = mockItem.price * 0.7; // Max 70% for partial refund

  // Determine which payment form to show
  const getPaymentForm = () => {
    if (selectedMethod.includes('wallet')) {
      return (
        <EWalletForm
          details={eWalletDetails}
          onChange={setEWalletDetails}
        />
      );
    }
    
    if (selectedMethod.includes('bank')) {
      return (
        <BankTransferForm
          details={bankDetails}
          onChange={setBankDetails}
        />
      );
    }
    
    if (selectedMethod.includes('moneyback')) {
      return (
        <RemittanceForm
          details={remittanceDetails}
          onChange={setRemittanceDetails}
        />
      );
    }
    
    return null;
  };

  // Check if form is ready for submission
  const isFormValid = () => {
    if (!selectedMethod || !reason) return false;
    
    // Check payment details based on method
    if (selectedMethod.includes('wallet')) {
      return eWalletDetails.provider && eWalletDetails.accountNumber && 
             eWalletDetails.accountName && eWalletDetails.contactNumber;
    }
    
    if (selectedMethod.includes('bank')) {
      return bankDetails.bankName && bankDetails.accountNumber && 
             bankDetails.accountName && bankDetails.accountType;
    }
    
    if (selectedMethod.includes('moneyback')) {
      return remittanceDetails.provider && remittanceDetails.firstName && 
             remittanceDetails.lastName && remittanceDetails.contactNumber &&
             remittanceDetails.validIdType && remittanceDetails.validIdNumber;
    }
    
    // For voucher methods, no additional details needed
    return true;
  };

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
            <span className="font-semibold">Back to Orders</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Request Refund & Return
          </h1>
          <p className="text-gray-600">
            Submit a refund or return request for your purchase
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Policy */}
          <div className="lg:col-span-1">
            <PolicySection />
          </div>

          {/* Right Column: Request Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Item Details */}
            <ItemCard item={mockItem} />

            {/* Refund Request Form */}
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Reason Section */}
                <div className="space-y-3">
                  <Label htmlFor="reason" className="text-lg font-semibold">
                    Reason for Refund/Return *
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please describe the issue with your purchase in detail. Include any defects, damages, or mismatches..."
                    className="min-h-[120px]"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Be specific and detailed. This helps us process your request faster.
                  </p>
                </div>

                {/* Evidence Upload */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Evidence (Optional)
                  </Label>
                  <p className="text-sm text-gray-500">
                    Upload photos or videos showing the issue. Max 4 files, 5MB each.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    {/* Upload Button */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={images.length >= 4}
                      />
                      <div className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${images.length >= 4 ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500'} transition-colors`}>
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">Add Evidence</span>
                        <span className="text-xs">{images.length}/4</span>
                      </div>
                    </label>

                    {/* Image Previews */}
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="w-24 h-24 rounded-lg border overflow-hidden">
                          <img
                            src={image}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImageRemove(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refund Method Selection - DROPDOWN VERSION */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">
                    Select Refund/Return Method *
                  </Label>
                  
                  <Select
                    value={selectedMethod}
                    onValueChange={setSelectedMethod}
                  >
                    <SelectTrigger className="w-full h-14 text-left">
                      <SelectValue placeholder="Choose a refund method">
                        {selectedMethodData ? (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <selectedMethodData.icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{selectedMethodData.label}</div>
                              <div className="text-sm text-gray-600 truncate">{selectedMethodData.description}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Select a refund method...</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-full max-w-full">
                      {/* Return Items Section */}
                      <div className="p-2">
                        <div className="text-sm font-semibold text-gray-700 mb-2 px-2">Return Items</div>
                        {refundMethods
                          .filter(method => method.type === 'return')
                          .map((method) => (
                            <SelectItem key={method.id} value={method.id} className="py-3">
                              <MethodItem method={method} />
                            </SelectItem>
                          ))
                        }
                      </div>
                      
                      <Separator />
                      
                      {/* Keep Items Section */}
                      <div className="p-2">
                        <div className="text-sm font-semibold text-gray-700 mb-2 px-2">Keep Items (Partial Refund)</div>
                        {refundMethods
                          .filter(method => method.type === 'keep')
                          .map((method) => (
                            <SelectItem key={method.id} value={method.id} className="py-3">
                              <MethodItem method={method} />
                            </SelectItem>
                          ))
                        }
                      </div>
                    </SelectContent>
                  </Select>

                  {/* Selected Method Preview */}
                  {selectedMethodData && (
                    <div className="p-4 bg-gray-50 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Selected Method:</span>
                        <Badge
                          variant={selectedMethodData.type === 'return' ? 'default' : 'secondary'}
                        >
                          {selectedMethodData.type === 'return' ? 'Return Item' : 'Keep Item'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{selectedMethodData.description}</p>
                    </div>
                  )}
                </div>

                {/* Partial Amount Input */}
                {showPartialAmount && (
                  <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <Label className="font-semibold">Partial Refund Amount</Label>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      You can request up to 70% of the item value (₱{maxPartialAmount.toFixed(2)})
                    </p>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                      <Input
                        type="number"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="pl-8"
                        placeholder="Enter amount"
                        min="1"
                        max={maxPartialAmount}
                        step="0.01"
                      />
                    </div>
                    {partialAmount && parseFloat(partialAmount) > maxPartialAmount && (
                      <p className="text-sm text-red-600">
                        Amount cannot exceed ₱{maxPartialAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Method Details */}
                {getPaymentForm()}

                {/* Voucher Information Alert */}
                {(selectedMethod.includes('voucher')) && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <Bell className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-purple-700">
                      <strong>Vouchers will be sent directly to your notifications</strong> and email once approved.
                      No additional details required.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Replacement Information Alert */}
                {selectedMethod === 'replace' && (
                  <Alert className="bg-green-50 border-green-200">
                    <Package className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      A replacement item will be shipped once we receive and verify the returned item.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Terms Agreement */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <Label htmlFor="terms" className="font-semibold">
                        Terms and Conditions Agreement
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        By submitting this request, I acknowledge that:
                      </p>
                      <ul className="text-sm text-gray-600 list-disc pl-5 mt-2 space-y-1">
                        <li>I have read and agree to the Refund & Return Items Policy</li>
                        <li>The information provided is accurate and truthful</li>
                        <li>False claims may result in account suspension</li>
                        <li>Processing may take 1-2 business days for review</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid() || isSubmitting}
                  className="w-full py-6 text-lg"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Refund Request
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    What Happens Next?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">1</span>
                        </div>
                        <span className="font-medium">Review Process</span>
                      </div>
                      <p className="text-sm text-gray-600 pl-8">
                        Your request will be reviewed within 1-2 business days by our support team.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">2</span>
                        </div>
                        <span className="font-medium">Decision Notification</span>
                      </div>
                      <p className="text-sm text-gray-600 pl-8">
                        You'll receive a notification about the decision via email and in-app.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-600">3</span>
                        </div>
                        <span className="font-medium">Next Steps</span>
                      </div>
                      <p className="text-sm text-gray-600 pl-8">
                        If approved, follow the instructions provided to complete the process.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-amber-600">4</span>
                        </div>
                        <span className="font-medium">Refund Processing</span>
                      </div>
                      <p className="text-sm text-gray-600 pl-8">
                        Refunds are processed within 3-5 business days after verification.
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