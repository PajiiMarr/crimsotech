"use client";
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import Breadcrumbs from "~/components/ui/breadcrumbs";
import {
  ArrowLeft,
  Calendar,
  Upload,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  ShoppingBag,
  CreditCard,
  MapPin,
  Phone,
  ShoppingCart,
  RotateCcw,
  Banknote,
  Wallet,
  Tag,
  RefreshCw,
  ChevronDown,
  Package,
  XCircle,
  MessageCircle,
  HelpCircle,
  X,
  AlertTriangle,
  Bell,
  Shield,
  Truck,
  Info,
  PhilippinePeso,
  Download,
  ChevronRight
} from 'lucide-react';

// --- Types ---
interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  subtotal: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  shop_id: string;
  shop_name: string;
  color?: string;
  seller_note?: string;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: 'completed';
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total_amount: number;
  items: OrderItem[];
  payment: {
    method: 'cod' | 'gcash' | 'paymaya' | 'credit_card' | 'bank_transfer';
    status: 'paid';
  };
}

interface RefundMethod {
  id: string;
  label: string;
  description: string;
  icon: any;
  type: 'return' | 'keep';
  subType: 'wallet' | 'bank' | 'voucher' | 'replace' | 'moneyback';
}

// Payment method detail types
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

// Refund methods data
const refundMethods: RefundMethod[] = [
  {
    id: 'wallet-return',
    label: 'Return Item & Refund to Wallet',
    description: 'Return the item and get refund to your e-wallet',
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

// Return reasons options
const returnReasons = [
  'Product arrived damaged',
  'Wrong item received',
  'Item defective or not working',
  'Product not as described',
  'Changed my mind / No longer needed',
  'Wrong size / Doesn\'t fit',
  'Received wrong color',
  'Missing parts or accessories',
  'Other'
];

// --- Payment Method Form Components ---

// E-Wallet Form Component
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
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mt-4">
      <h4 className="font-semibold text-blue-800 flex items-center gap-2">
        <Wallet className="w-4 h-4" />
        E-Wallet Details
      </h4>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-700">
            Refunds will be sent to this e-wallet. Ensure details are correct.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">E-Wallet Provider *</label>
          <select
            value={details.provider}
            onChange={(e) => onChange({ ...details, provider: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select provider</option>
            {eWalletProviders.map(provider => (
              <option key={provider} value={provider.toLowerCase()}>
                {provider}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Number *</label>
          <input
            type="text"
            value={details.accountNumber}
            onChange={(e) => onChange({ ...details, accountNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Name *</label>
          <input
            type="text"
            value={details.accountName}
            onChange={(e) => onChange({ ...details, accountName: e.target.value })}
            placeholder="As it appears in the app"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Contact Number *</label>
          <input
            type="text"
            value={details.contactNumber}
            onChange={(e) => onChange({ ...details, contactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

// Bank Transfer Form Component
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
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100 mt-4">
      <h4 className="font-semibold text-green-800 flex items-center gap-2">
        <CreditCard className="w-4 h-4" />
        Bank Account Details
      </h4>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">
            Refunds will be transferred to this bank account. Processing may take 3-5 business days.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Bank Name *</label>
          <select
            value={details.bankName}
            onChange={(e) => onChange({ ...details, bankName: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select bank</option>
            {bankList.map(bank => (
              <option key={bank} value={bank.toLowerCase()}>
                {bank}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Number *</label>
          <input
            type="text"
            value={details.accountNumber}
            onChange={(e) => onChange({ ...details, accountNumber: e.target.value })}
            placeholder="000-000-000"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Name *</label>
          <input
            type="text"
            value={details.accountName}
            onChange={(e) => onChange({ ...details, accountName: e.target.value })}
            placeholder="As it appears in bank records"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Account Type *</label>
          <select
            value={details.accountType}
            onChange={(e) => onChange({ ...details, accountType: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select type</option>
            {accountTypes.map(type => (
              <option key={type} value={type.toLowerCase()}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Branch</label>
          <input
            type="text"
            value={details.branch}
            onChange={(e) => onChange({ ...details, branch: e.target.value })}
            placeholder="Bank branch location"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
    </div>
  );
};

// Remittance Form Component
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
    <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-100 mt-4">
      <h4 className="font-semibold text-amber-800 flex items-center gap-2">
        <Banknote className="w-4 h-4" />
        Remittance Details
      </h4>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700">
            Money back will be sent via remittance. You'll receive a notification when ready for pickup.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Remittance Provider *</label>
          <select
            value={details.provider}
            onChange={(e) => onChange({ ...details, provider: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select provider</option>
            {remittanceProviders.map(provider => (
              <option key={provider} value={provider.toLowerCase()}>
                {provider}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Valid ID Type *</label>
          <select
            value={details.validIdType}
            onChange={(e) => onChange({ ...details, validIdType: e.target.value })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select ID type</option>
            {validIdTypes.map(idType => (
              <option key={idType} value={idType.toLowerCase()}>
                {idType}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Valid ID Number *</label>
          <input
            type="text"
            value={details.validIdNumber}
            onChange={(e) => onChange({ ...details, validIdNumber: e.target.value })}
            placeholder="ID number"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Contact Number *</label>
          <input
            type="text"
            value={details.contactNumber}
            onChange={(e) => onChange({ ...details, contactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">First Name *</label>
          <input
            type="text"
            value={details.firstName}
            onChange={(e) => onChange({ ...details, firstName: e.target.value })}
            placeholder="Given name"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Last Name *</label>
          <input
            type="text"
            value={details.lastName}
            onChange={(e) => onChange({ ...details, lastName: e.target.value })}
            placeholder="Surname"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Complete Address *</label>
          <input
            type="text"
            value={details.address}
            onChange={(e) => onChange({ ...details, address: e.target.value })}
            placeholder="Street, Barangay"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">City/Municipality *</label>
          <input
            type="text"
            value={details.city}
            onChange={(e) => onChange({ ...details, city: e.target.value })}
            placeholder="City"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Province *</label>
          <input
            type="text"
            value={details.province}
            onChange={(e) => onChange({ ...details, province: e.target.value })}
            placeholder="Province"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">ZIP Code</label>
          <input
            type="text"
            value={details.zipCode}
            onChange={(e) => onChange({ ...details, zipCode: e.target.value })}
            placeholder="0000"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>
    </div>
  );
};

// --- Loader ---
export async function loader({ params }: any) {
  const { refundId } = params as { refundId: string };

  // Mock data
  const order: Order = {
    id: refundId || "PUR-2024-00123",
    order_number: `ORD-${Date.now().toString().slice(-6)}`,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-18T14:20:00Z',
    status: 'completed',
    subtotal: 4567.89,
    shipping_fee: 150.00,
    tax: 547.55,
    discount: 200.00,
    total_amount: 5065.44,
    items: [
      {
        id: 'item-001',
        product_id: 'prod-001',
        name: 'Wireless Bluetooth Headphones',
        price: 2499.99,
        quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        subtotal: 2499.99,
        status: 'delivered',
        shop_id: 'shop-001',
        shop_name: 'AudioTech Store',
        color: 'Black',
        seller_note: 'Includes 1-year warranty'
      },
      {
        id: 'item-002',
        product_id: 'prod-002',
        name: 'Smart Watch Series 5',
        price: 3450.00,
        quantity: 2,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        subtotal: 6900.00,
        status: 'delivered',
        shop_id: 'shop-002',
        shop_name: 'Gadget World',
        color: 'Gray',
        seller_note: 'Free screen protector included'
      },
    ],
    payment: {
      method: 'gcash',
      status: 'paid'
    }
  };

  return { order };
}

// --- Component ---
export default function RequestReturnRefund({ loaderData }: any) {
  const { order } = loaderData;
  const navigate = useNavigate();
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [selectedRefundMethod, setSelectedRefundMethod] = useState<RefundMethod | null>(null);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Payment method details
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handleItemSelect = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

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

  const getPaymentForm = () => {
    if (!selectedRefundMethod) return null;
    
    if (selectedRefundMethod.subType === 'wallet') {
      return (
        <EWalletForm
          details={eWalletDetails}
          onChange={setEWalletDetails}
        />
      );
    }
    
    if (selectedRefundMethod.subType === 'bank') {
      return (
        <BankTransferForm
          details={bankDetails}
          onChange={setBankDetails}
        />
      );
    }
    
    if (selectedRefundMethod.subType === 'moneyback') {
      return (
        <RemittanceForm
          details={remittanceDetails}
          onChange={setRemittanceDetails}
        />
      );
    }
    
    return null;
  };

  const isPaymentDetailsValid = () => {
    if (!selectedRefundMethod) return true;
    
    if (selectedRefundMethod.subType === 'wallet') {
      return eWalletDetails.provider && eWalletDetails.accountNumber && 
             eWalletDetails.accountName && eWalletDetails.contactNumber;
    }
    
    if (selectedRefundMethod.subType === 'bank') {
      return bankDetails.bankName && bankDetails.accountNumber && 
             bankDetails.accountName && bankDetails.accountType;
    }
    
    if (selectedRefundMethod.subType === 'moneyback') {
      return remittanceDetails.provider && remittanceDetails.firstName && 
             remittanceDetails.lastName && remittanceDetails.contactNumber &&
             remittanceDetails.validIdType && remittanceDetails.validIdNumber;
    }
    
    // For voucher and replace methods, no additional details needed
    return true;
  };

  const handleSubmitReturn = () => {
  if (selectedItems.length === 0) {
    alert('Please select at least one item to return');
    return;
  }
  if (!returnReason) {
    alert('Please select a reason for return');
    return;
  }
  if (!selectedRefundMethod) {
    alert('Please select a refund method');
    return;
  }
  if (!isPaymentDetailsValid()) {
    alert('Please complete the payment details');
    return;
  }

  // Generate a unique refund request ID
  const refundRequestId = `REF-${Date.now().toString().slice(-8)}`;
  
  const returnData = {
    id: refundRequestId,
    orderId: order.id,
    order_number: order.order_number,
    items: selectedItems,
    reason: returnReason,
    additionalDetails,
    refundMethod: selectedRefundMethod,
    images,
    partialAmount: selectedRefundMethod.type === 'keep' ? parseFloat(partialAmount) : null,
    paymentDetails: selectedRefundMethod.subType === 'wallet' ? eWalletDetails :
                   selectedRefundMethod.subType === 'bank' ? bankDetails :
                   selectedRefundMethod.subType === 'moneyback' ? remittanceDetails : null,
    requestedAt: new Date().toISOString(),
    status: 'pending', // Set status to pending
    shop_name: order.items[0]?.shop_name || 'Unknown Shop', // Get shop name from first item
    product_name: order.items.find((item: any) => selectedItems.includes(item.id))?.name || 'Product',
    color: order.items.find((item: any) => selectedItems.includes(item.id))?.color || '',
    quantity: selectedItems.length,
    refund_amount: selectedRefundMethod?.type === 'keep' && partialAmount 
      ? parseFloat(partialAmount)
      : order.items
          .filter((item: any) => selectedItems.includes(item.id))
          .reduce((sum: number, item: any) => sum + item.subtotal, 0),
    preferred_refund_method: selectedRefundMethod.label,
    evidence_count: images.length,
    image: order.items.find((item: any) => selectedItems.includes(item.id))?.image_url || '',
    last_updated: new Date().toISOString(),
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days deadline
  };

  console.log('Return request submitted:', returnData);
  alert('Return request submitted successfully! The seller will review your request within 48 hours.');
  
  // Navigate to view-customer-return-cancel with pending status
  navigate(`/view-customer-return-cancel/${refundRequestId}?status=pending`);
};

  // Calculate maximum partial amount for keep items
  const getMaxPartialAmount = () => {
    if (!selectedRefundMethod || selectedRefundMethod.type !== 'keep') return 0;
    const selectedItemsTotal = order.items
      .filter((item: OrderItem) => selectedItems.includes(item.id))
      .reduce((sum: number, item: OrderItem) => sum + item.subtotal, 0);
    return selectedItemsTotal * 0.7; // Max 70% for partial refund
  };

  const maxPartialAmount = getMaxPartialAmount();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/view-order/${order.id}`)}
          className="text-gray-600 hover:text-gray-900 px-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Order</span>
        </Button>
        <Breadcrumbs />
      </div>

      <Separator />

      {/* Header with Order Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Request Return / Refund</h1>
            <p className="text-muted-foreground">Order #<strong>{order.order_number}</strong></p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Delivered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Return Request Details
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Order #{order.order_number}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Order Date
                  </p>
                  <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Items
                  </p>
                  <p className="font-medium text-sm">{order.items.length} items</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Payment Method
                  </p>
                  <p className="font-medium text-sm">{order.payment.method.toUpperCase()}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Payment Status
                  </p>
                  <p className="font-medium text-sm text-green-600">Paid</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <ShoppingCart className="h-3 w-3" />
                  Select Items to Return ({selectedItems.length} of {order.items.length} selected)
                </p>
                <div className="space-y-3">
                  {order.items.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemSelect(item.id)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedItems.includes(item.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 flex-shrink-0">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 ${
                          selectedItems.includes(item.id)
                            ? 'bg-blue-500 border-white'
                            : 'bg-white border-gray-300'
                        }`}>
                          {selectedItems.includes(item.id) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Qty: {item.quantity}</span>
                          {item.color && (
                            <>
                              <span>•</span>
                              <span>Color: {item.color}</span>
                            </>
                          )}
                        </div>
                        {item.seller_note && (
                          <p className="text-xs text-blue-600 mt-0.5">{item.seller_note}</p>
                        )}
                      </div>
                      <div className="font-medium text-sm">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Method */}
              <div>
                <p className="text-sm font-medium mb-3">Preferred Refund Method</p>
                <div className="relative">
                  <select
                    value={selectedRefundMethod?.id || ''}
                    onChange={(e) => {
                      const method = refundMethods.find(m => m.id === e.target.value);
                      setSelectedRefundMethod(method || null);
                      // Reset partial amount when method changes
                      if (method?.type === 'keep') {
                        setPartialAmount('');
                      }
                    }}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select refund method</option>
                    <optgroup label="Return Item">
                      {refundMethods.filter(m => m.type === 'return').map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Keep Item (Partial Refund)">
                      {refundMethods.filter(m => m.type === 'keep').map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                
                {selectedRefundMethod && (
                  <div className="mt-3 p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <selectedRefundMethod.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{selectedRefundMethod.label}</p>
                          <Badge variant="outline" className={`text-xs ${
                            selectedRefundMethod.type === 'return' 
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {selectedRefundMethod.type === 'return' ? 'Return Item' : 'Keep Item'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{selectedRefundMethod.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Form */}
                {getPaymentForm()}

                {/* Partial Amount Input for Keep Items */}
                {selectedRefundMethod?.type === 'keep' && (
                  <div className="mt-4 space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <label className="text-sm font-medium">Partial Refund Amount *</label>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      You can request up to 70% of the item value (Max: {formatCurrency(maxPartialAmount)})
                    </p>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                      <input
                        type="number"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="w-full pl-8 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="Enter amount"
                        min="1"
                        max={maxPartialAmount}
                        step="0.01"
                        required
                      />
                    </div>
                    {partialAmount && parseFloat(partialAmount) > maxPartialAmount && (
                      <p className="text-sm text-red-600">
                        Amount cannot exceed {formatCurrency(maxPartialAmount)}
                      </p>
                    )}
                  </div>
                )}

                {/* Voucher/Replacement Information */}
                {selectedRefundMethod?.subType === 'voucher' && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-800">Voucher Information</p>
                    </div>
                    <p className="text-sm text-purple-700">
                      Vouchers will be sent directly to your notifications and email once approved.
                      No additional details required.
                    </p>
                  </div>
                )}

                {selectedRefundMethod?.subType === 'replace' && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">Replacement Information</p>
                    </div>
                    <p className="text-sm text-green-700">
                      A replacement item will be shipped once we receive and verify the returned item.
                    </p>
                  </div>
                )}
              </div>

              {/* Return Reason */}
              <div>
                <p className="text-sm font-medium mb-3">Reason for Return</p>
                <div className="relative">
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select a reason for return</option>
                    {returnReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                
                {returnReason && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-800">Selected: <span className="font-medium">{returnReason}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div>
                <p className="text-sm font-medium mb-3">Additional Details (Optional)</p>
                <textarea
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="Please provide any additional details about your return request..."
                  className="w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Upload Photos - Compact Version */}
              <div>
                <p className="text-sm font-medium mb-3">Upload Evidence (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">
                  Upload photos or videos showing the issue. Max 4 files, 5MB each.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  {/* Upload Button */}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={images.length >= 4}
                      ref={fileInputRef}
                    />
                    <div className={`w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
                      images.length >= 4 
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer'
                    } transition-colors`}>
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-xs">{images.length}/4</span>
                    </div>
                  </label>

                  {/* Image Previews - Compact */}
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-16 h-16 rounded-lg border overflow-hidden">
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping:</span>
                <span>{formatCurrency(order.shipping_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-green-600">-{formatCurrency(order.discount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-sm">
                <span>Total:</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Refund */}
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estimated Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Selected:</span>
                <span>{selectedItems.length} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Method:</span>
                <span className="font-medium">
                  {selectedRefundMethod 
                    ? selectedRefundMethod.type === 'return' ? 'Return' : 'Keep Item'
                    : 'Not selected'
                  }
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-sm">
                <span>Amount:</span>
                <span>
                  {selectedRefundMethod?.type === 'keep' && partialAmount 
                    ? formatCurrency(parseFloat(partialAmount))
                    : selectedItems.length > 0 
                    ? formatCurrency(
                        order.items
                          .filter((item: any) => selectedItems.includes(item.id))
                          .reduce((sum: number, item: any) => sum + item.subtotal, 0)
                      )
                    : formatCurrency(0)
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Return Policy */}
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Return Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <Package className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>7-day return window from delivery</span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Free return for damaged items</span>
                </div>
                <div className="flex items-start gap-2">
                  <Banknote className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Refund in 3-5 business days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Request */}
          <Card className="border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Submit Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSubmitReturn}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
                disabled={
                  selectedItems.length === 0 || 
                  !returnReason || 
                  !selectedRefundMethod || 
                  !isPaymentDetailsValid() ||
                  (selectedRefundMethod?.type === 'keep' && (!partialAmount || parseFloat(partialAmount) > maxPartialAmount))
                }
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Submit Return Request
              </Button>
              
              <div className="pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => navigate(`/view-order/${order.id}`)}
                >
                  <ArrowLeft className="h-3 w-3 mr-1.5" />
                  Back to Order
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start h-8 text-xs mt-1"
                >
                  <MessageCircle className="h-3 w-3 mr-1.5" />
                  Contact Seller
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}