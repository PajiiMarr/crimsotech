"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { Textarea } from '~/components/ui/textarea';
import Breadcrumbs from "~/components/ui/breadcrumbs";
import AxiosInstance from "~/components/axios/Axios";
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
  Truck,
  Info,
  Download,
  ChevronRight,
  Clock,
  Loader2,
  Shield,
  AlertCircle,
  Star,
  Home,
  User,
  Percent,
  DollarSign
} from 'lucide-react';

// --- Types ---
interface OrderItem {
  checkout_id: string;
  cart_item_id: string | null;
  product_id: string;
  product_name: string;
  shop_id: string | null;
  shop_name: string | null;
  seller_username: string | null;
  quantity: number;
  price: string;
  subtotal: string;
  status: string;
  remarks: string;
  purchased_at: string;
  voucher_applied: {
    id: string;
    name: string;
    code: string;
  } | null;
  can_review: boolean;
}

interface PurchaseOrder {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string | null;
  delivery_address: string;
  created_at: string;
  payment_status: string | null;
  delivery_status: string | null;
  delivery_rider: string | null;
  items: OrderItem[];
}

interface RefundType {
  id: 'return_item' | 'keep_item' | 'replacement';
  label: string;
  description: string;
  icon: any;
  refundAmount: 'full' | 'partial' | 'replacement';
}

interface RefundMethod {
  id: string;
  label: string;
  description: string;
  icon: any;
  type: 'wallet' | 'bank' | 'voucher' | 'moneyback' | 'replace';
  allowedRefundTypes: ('return_item' | 'keep_item' | 'replacement')[];
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

// Refund types - separate from methods
const refundTypes: RefundType[] = [
  {
    id: 'return_item',
    label: 'Return Item',
    description: 'Return the item for a full refund',
    icon: RotateCcw,
    refundAmount: 'full'
  },
  {
    id: 'keep_item',
    label: 'Keep Item',
    description: 'Keep the item and request partial refund',
    icon: Package,
    refundAmount: 'partial'
  },
  {
    id: 'replacement',
    label: 'Replacement',
    description: 'Return item for a replacement',
    icon: RefreshCw,
    refundAmount: 'replacement'
  }
];

// Refund methods - simplified
const refundMethods: RefundMethod[] = [
  {
    id: 'wallet',
    label: 'Refund to Wallet',
    description: 'Get refund to your e-wallet',
    icon: Wallet,
    type: 'wallet',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    description: 'Get refund via bank transfer',
    icon: CreditCard,
    type: 'bank',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'voucher',
    label: 'Store Voucher',
    description: 'Receive a store voucher',
    icon: Tag,
    type: 'voucher',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'moneyback',
    label: 'Money Back (Remittance)',
    description: 'Get cash via remittance',
    icon: Banknote,
    type: 'moneyback',
    allowedRefundTypes: ['return_item', 'keep_item']
  },
  {
    id: 'replace',
    label: 'Replacement',
    description: 'Get a replacement item',
    icon: RefreshCw,
    type: 'replace',
    allowedRefundTypes: ['replacement']
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

// Custom Dropdown Component
const CustomDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  icon: Icon,
  label
}: { 
  value: string;
  onChange: (value: string) => void;
  options: Array<{id: string, label: string, icon?: any, description?: string}>;
  placeholder: string;
  icon?: any;
  label: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.id === value);
  
  return (
    <div className="relative">
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between ${
          selectedOption ? 'bg-white' : 'bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <div className="flex-1">
            {selectedOption ? (
              <div>
                <span className="font-medium">{selectedOption.label}</span>
                {selectedOption.description && (
                  <p className="text-xs text-gray-500 truncate">{selectedOption.description}</p>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3 ${
                  value === option.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                {OptionIcon && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <OptionIcon className="w-4 h-4 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 truncate">{option.description}</div>
                  )}
                </div>
                {value === option.id && (
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Loader ---
export async function loader({ params, request, context }: any) {
  const orderId = params.id;
  
  // Validate orderId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!orderId || !uuidRegex.test(orderId)) {
    throw new Response('Invalid order ID', { status: 400 });
  }
  
  // Add authentication middleware - handles session
  const { registrationMiddleware } = await import("~/middleware/registration.server");
  await registrationMiddleware({ request, context, params, unstable_pattern: undefined } as any);

  const { requireRole } = await import("~/middleware/role-require.server");
  const { fetchUserRole } = await import("~/middleware/role.server");

  // Get user from session context
  let user = (context as any).user;
  if (!user) {
    user = await fetchUserRole({ request, context });
  }

  // Ensure user has customer role
  await requireRole(request, context, ["isCustomer"]);

  try {
    // Fetch the specific order for the user
    const response = await AxiosInstance.get(`/purchases-buyer/${orderId}/`, {
      headers: {
        'X-User-Id': user?.user_id || ''
      }
    });
    
    // The response is the order data directly
    const order = response.data;

    return {
      order,
      user: {
        id: user?.user_id || '',
        name: user?.username || '',
        email: user?.email || '',
        isCustomer: true,
      }
    };
  } catch (error: any) {
    console.error('Error fetching order:', error);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      throw new Response('Unauthorized - Please login again', { status: 401 });
    }
    
    if (error.response?.status === 404) {
      throw new Response('Order not found', { status: 404 });
    }
    
    throw new Response('Failed to load order. Please try again.', { status: 500 });
  }
}

// --- Component ---
export default function RequestReturnRefund({ loaderData }: any) {
  const { order, user } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Get selected item ID from location state if passed from view-order page
  const preselectedItemId = location.state?.selectedItemId;
  
  const [selectedItems, setSelectedItems] = useState<string[]>(preselectedItemId ? [preselectedItemId] : []);
  const [selectedRefundType, setSelectedRefundType] = useState<RefundType | null>(null);
  const [selectedRefundMethod, setSelectedRefundMethod] = useState<RefundMethod | null>(null);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [returnReason, setReturnReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Get selected items details
  const selectedItemsDetails = order.items.filter((item: OrderItem) => 
    selectedItems.includes(item.checkout_id)
  );

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '₱0.00';
    return `₱${numAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Calculate refund amounts
  const calculateRefundAmounts = () => {
    if (selectedItems.length === 0) return { fullAmount: 0, maxPartialAmount: 0 };
    
    const fullAmount = selectedItemsDetails.reduce((sum: number, item: OrderItem) => 
      sum + parseFloat(item.subtotal), 0
    );
    
    // For keep items, max 70% of full amount
    const maxPartialAmount = fullAmount * 0.7;
    
    return { fullAmount, maxPartialAmount };
  };

  const { fullAmount, maxPartialAmount } = calculateRefundAmounts();

  // When refund type is partial (keep_item), default the partial amount to the maximum partial value
  useEffect(() => {
    if (selectedRefundType && selectedRefundType.id === 'keep_item') {
      // If user hasn't entered a value yet, default to maxPartialAmount
      if (!partialAmount || parseFloat(String(partialAmount)) <= 0) {
        setPartialAmount((Math.round((maxPartialAmount || 0) * 100) / 100).toFixed(2));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRefundType, maxPartialAmount]);

  // Compute refund breakdown (base amount, fee, final amount)
  const computeRefundBreakdown = () => {
    const selectedTotal = selectedItemsDetails.reduce((sum: number, item: OrderItem) => sum + parseFloat(item.subtotal), 0);

    // Base amount depends on refund type
    let baseAmount = selectedTotal;
    if (selectedRefundType && selectedRefundType.id === 'keep_item') {
      baseAmount = partialAmount ? parseFloat(partialAmount) : maxPartialAmount;
    } else if (selectedRefundType && (selectedRefundType.id === 'return_item' || selectedRefundType.id === 'replacement')) {
      baseAmount = selectedTotal;
    }

    // Fee rules by refund method subtype
    let fee = 0;
    const methodType = selectedRefundMethod?.type;
    if (methodType === 'moneyback') {
      fee = 50; // remittance fee
    } else if (methodType === 'wallet') {
      fee = 10; // e-wallet fee
    }

    const finalAmount = Math.max(0, baseAmount - fee);

    return { baseAmount, fee, finalAmount };
  };

  // Precompute current breakdown for rendering
  const breakdown = computeRefundBreakdown();

  // Get available methods for selected refund type
  const getAvailableMethods = () => {
    if (!selectedRefundType) return refundMethods;
    
    return refundMethods.filter(method => 
      method.allowedRefundTypes.includes(selectedRefundType.id)
    );
  };

  const handleItemSelect = (checkoutId: string) => {
    if (selectedItems.includes(checkoutId)) {
      setSelectedItems(selectedItems.filter(id => id !== checkoutId));
    } else {
      setSelectedItems([...selectedItems, checkoutId]);
    }
  };

  const handleRefundTypeSelect = (typeId: string) => {
    const type = refundTypes.find(t => t.id === typeId);
    if (type) {
      setSelectedRefundType(type);
      // Reset method if incompatible
      if (selectedRefundMethod) {
        const availableMethods = getAvailableMethods();
        if (!availableMethods.some(m => m.id === selectedRefundMethod.id)) {
          setSelectedRefundMethod(null);
        }
      }
    }
  };

  const handleRefundMethodSelect = (methodId: string) => {
    const method = getAvailableMethods().find(m => m.id === methodId);
    if (method) {
      setSelectedRefundMethod(method);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && images.length + files.length <= 4) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages([...images, ...newImages]);
      setUploadedFiles([...uploadedFiles, ...Array.from(files)]);
    }
  };

  const handleImageRemove = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const getPaymentForm = () => {
    if (!selectedRefundMethod) return null;
    
    if (selectedRefundMethod.type === 'wallet') {
      return (
        <EWalletForm
          details={eWalletDetails}
          onChange={setEWalletDetails}
        />
      );
    }
    
    if (selectedRefundMethod.type === 'bank') {
      return (
        <BankTransferForm
          details={bankDetails}
          onChange={setBankDetails}
        />
      );
    }
    
    if (selectedRefundMethod.type === 'moneyback') {
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
    if (!selectedRefundMethod) return false;
    
    if (selectedRefundMethod.type === 'wallet') {
      return eWalletDetails.provider && eWalletDetails.accountNumber && 
             eWalletDetails.accountName && eWalletDetails.contactNumber;
    }
    
    if (selectedRefundMethod.type === 'bank') {
      return bankDetails.bankName && bankDetails.accountNumber && 
             bankDetails.accountName && bankDetails.accountType;
    }
    
    if (selectedRefundMethod.type === 'moneyback') {
      return remittanceDetails.provider && remittanceDetails.firstName && 
             remittanceDetails.lastName && remittanceDetails.contactNumber &&
             remittanceDetails.validIdType && remittanceDetails.validIdNumber;
    }
    
    // For voucher and replace methods, no additional details needed
    return true;
  };

  const validateForm = () => {
    if (selectedItems.length === 0) {
      return 'Please select at least one item to return';
    }
    if (!selectedRefundType) {
      return 'Please select a refund type';
    }
    if (!selectedRefundMethod) {
      return 'Please select a refund method';
    }
    if (!isPaymentDetailsValid()) {
      return 'Please complete the payment details';
    }
    if (!returnReason) {
      return 'Please select a reason for return';
    }
    if (selectedRefundType.id === 'keep_item' && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      return 'Please enter a valid partial refund amount';
    }
    if (selectedRefundType.id === 'keep_item' && parseFloat(partialAmount) > maxPartialAmount) {
      return `Amount cannot exceed ${formatCurrency(maxPartialAmount)}`;
    }
    return null;
  };

 const handleSubmitReturn = async () => {
  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
    setTimeout(() => setError(null), 5000);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    // Recompute breakdown and use final amount as the total refund stored in DB
    const breakdown = computeRefundBreakdown();
    const requestedBaseAmount = Number((breakdown.baseAmount || 0).toFixed(2));
    const feeAmount = Number((breakdown.fee || 0).toFixed(2));
    const finalRefundAmount = Number((breakdown.finalAmount || 0).toFixed(2));

    // Map type to backend expected value
    const mapTypeToRefundMethod = (type: string) => {
      switch (type) {
        case 'wallet': return 'wallet';
        case 'bank': return 'bank';
        case 'voucher': return 'voucher';
        case 'moneyback': return 'remittance';
        case 'replace': return 'replace';
        default: return type;
      }
    };

    // Create FormData for file uploads
    const formData = new FormData();

    // Add refund data as JSON string (include breakdown fields)
    const refundData = {
      order_id: order.order_id,
      reason: returnReason,
      preferred_refund_method: mapTypeToRefundMethod(selectedRefundMethod!.type),
      requested_refund_amount: requestedBaseAmount, // buyer requested/base amount (before fees)
      refund_fee: feeAmount,
      total_refund_amount: finalRefundAmount, // final amount to be paid to buyer (stored)
      customer_note: additionalDetails || '',
      refund_category: selectedRefundType!.id,
      // Add payment method details based on type
      ...(selectedRefundMethod!.type === 'wallet' ? {
        wallet_details: {
          provider: eWalletDetails.provider,
          account_name: eWalletDetails.accountName,
          account_number: eWalletDetails.accountNumber,
          contact_number: eWalletDetails.contactNumber
        }
      } : {}),
      ...(selectedRefundMethod!.type === 'bank' ? {
        bank_details: {
          bank_name: bankDetails.bankName,
          account_name: bankDetails.accountName,
          account_number: bankDetails.accountNumber,
          account_type: bankDetails.accountType,
          branch: bankDetails.branch || ''
        }
      } : {}),
      ...(selectedRefundMethod!.type === 'moneyback' ? {
        remittance_details: {
          provider: remittanceDetails.provider,
          first_name: remittanceDetails.firstName,
          last_name: remittanceDetails.lastName,
          contact_number: remittanceDetails.contactNumber,
          address: remittanceDetails.address,
          city: remittanceDetails.city,
          province: remittanceDetails.province,
          zip_code: remittanceDetails.zipCode || '',
          valid_id_type: remittanceDetails.validIdType,
          valid_id_number: remittanceDetails.validIdNumber
        }
      } : {})
    };

    // Add JSON data to formData
    formData.append('refund_data', JSON.stringify(refundData));

    // Add selected items
    selectedItems.forEach((itemId, index) => {
      formData.append(`selected_item_${index}`, itemId);
    });

    // Add uploaded files
    uploadedFiles.forEach((file, index) => {
      formData.append(`evidence_${index}`, file);
    });

    console.log('Submitting refund request with form data');

    // Submit to backend - use multipart/form-data
    const response = await AxiosInstance.post('/return-refund/create_refund/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-User-Id': user.id
      }
    });

    console.log('Backend response:', response.data);

    if (response.data.refund_id || response.data.request_number) {
      const refundRequestId = response.data.refund_id || response.data.request_number;
      
      // Show success message
      alert('Return request submitted successfully!');
      
      // Navigate to refund requests page with refund-requests tab active
      navigate('/return-refund?tab=refund-requests', {
        state: {
          success: true,
          message: 'Return request submitted successfully! The seller will review your request within 48 hours.',
          refundId: refundRequestId
        }
      });
    } else if (response.data.message) {
      // Fallback for older API responses
      alert('Return request submitted successfully!');
      navigate('/return-refund?tab=refund-requests', {
        state: {
          success: true,
          message: 'Return request submitted! Check your notifications for updates.'
        }
      });
    } else {
      setError(response.data.error || 'Failed to submit request.');
    }
  } catch (error: any) {
    console.error('Error submitting refund request:', error);
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      
      if (error.response.status === 400 && error.response.data.error) {
        setError(error.response.data.error);
      } else if (error.response.data.errors) {
        // Django serializer errors
        const errors = Object.values(error.response.data.errors).flat();
        setError(errors.join(', '));
      } else if (error.response.data.detail) {
        // DRF error
        setError(error.response.data.detail);
      }
    } else if (error.message === 'Network Error') {
      setError('Network error. Please check your connection.');
    } else {
      setError('Failed to submit request. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  // Calculate refund amount based on selections
  const calculateRefundAmount = () => {
    if (!selectedRefundType || selectedItems.length === 0) return 0;
    
    if (selectedRefundType.id === 'keep_item' && partialAmount) {
      return parseFloat(partialAmount) || 0;
    }
    
    if (selectedRefundType.id === 'return_item') {
      return fullAmount;
    }
    
    return 0; // For replacement, no monetary refund
  };

  const refundAmount = calculateRefundAmount();

  // Get order status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'delivered':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'processing':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'pending':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'delivered':
        return Package;
      case 'shipped':
        return Truck;
      case 'processing':
      case 'pending':
        return Clock;
      case 'cancelled':
        return XCircle;
      default:
        return Clock;
    }
  };

  const StatusIcon = getStatusIcon(order.status);

  // Show error alert if exists
  const renderErrorAlert = () => {
    if (!error) return null;
    
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  };

  // Show loading state
  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/view-order/${order.order_id}`)}
          className="text-gray-600 hover:text-gray-900 px-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="font-semibold">Back to Order</span>
        </Button>
        <Breadcrumbs />
      </div>

      <Separator />

      {/* Error Alert */}
      {renderErrorAlert()}

      {/* Header with Order Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50">
            <RotateCcw className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Request Return / Refund</h1>
            <p className="text-muted-foreground">Order #<strong>{order.order_id}</strong></p>
            <p className="text-sm text-gray-500 mt-1">
              Ordered on {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={getStatusBadgeColor(order.status)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">Request Progress</div>
          <div className="text-sm text-gray-500">Step 1 of 3</div>
        </div>
        <Progress value={33} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span className="font-medium text-blue-600">Select Items</span>
          <span>Choose Type & Method</span>
          <span>Review & Submit</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Order Details
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {order.items.length} Items
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
                    Total Items
                  </p>
                  <p className="font-medium text-sm">{order.items.length} items</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Payment Method
                  </p>
                  <p className="font-medium text-sm">{order.payment_method?.toUpperCase() || 'N/A'}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Payment Status
                  </p>
                  <p className="font-medium text-sm text-green-600">
                    {order.payment_status || 'Paid'}
                  </p>
                </div>
              </div>

              {/* Delivery Info */}
              {order.delivery_address && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-1">Delivery Address</p>
                      <p className="text-sm text-gray-600">{order.delivery_address}</p>
                      {order.delivery_method && (
                        <p className="text-xs text-gray-500 mt-1">
                          Method: {order.delivery_method}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Select Items to Return
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {selectedItems.length} of {order.items.length} selected
                  </Badge>
                </div>
                
                {order.items.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Items</AlertTitle>
                    <AlertDescription>This order has no items.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {order.items.map((item: OrderItem) => (
                      <div
                        key={item.checkout_id}
                        onClick={() => handleItemSelect(item.checkout_id)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedItems.includes(item.checkout_id)
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="relative">
                          <div className="w-16 h-16 flex-shrink-0">
                            <img
                              src="/phon.jpg" // Default image
                              alt={item.product_name}
                              className="w-full h-full object-cover rounded border"
                            />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedItems.includes(item.checkout_id)
                              ? 'bg-blue-500 border-white'
                              : 'bg-white border-gray-300'
                          }`}>
                            {selectedItems.includes(item.checkout_id) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product_name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span className="truncate">Shop: {item.shop_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>Price: {formatCurrency(item.price)} each</span>
                          </div>
                          {item.remarks && (
                            <p className="text-xs text-blue-600 mt-1 italic">{item.remarks}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            {formatCurrency(item.subtotal)}
                          </div>
                          {selectedItems.includes(item.checkout_id) && (
                            <Badge variant="outline" className="text-xs mt-1 bg-green-50 text-green-700 border-green-200">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refund Type Selection */}
              <div>
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refund Type
                </p>
                
                <CustomDropdown
                  value={selectedRefundType?.id || ''}
                  onChange={handleRefundTypeSelect}
                  options={refundTypes.map(type => ({
                    id: type.id,
                    label: type.label,
                    icon: type.icon,
                    description: type.description
                  }))}
                  placeholder="Select refund type"
                  icon={RotateCcw}
                  label="What do you want to do with the item?"
                />
                
                {selectedRefundType && (
                  <div className="mt-4 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <selectedRefundType.icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{selectedRefundType.label}</p>
                          <p className="text-xs text-gray-500">{selectedRefundType.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        selectedRefundType.id === 'return_item' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        selectedRefundType.id === 'keep_item'
                          ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {selectedRefundType.id === 'return_item' ? 'Full Refund' : 
                         selectedRefundType.id === 'keep_item' ? 'Partial Refund' : 'Replacement'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {selectedRefundType.id === 'return_item' && (
                        <div>
                          <div>You&apos;ll return the item and receive a full refund of <strong>{formatCurrency(fullAmount)}</strong>.</div>
                          {selectedRefundMethod && (
                            <div className="text-xs text-gray-600 mt-1">
                              {breakdown.fee > 0 ? (
                                <>
                                  Fee ({selectedRefundMethod.label}): <strong>{formatCurrency(breakdown.fee)}</strong> — You will receive <strong>{formatCurrency(breakdown.finalAmount)}</strong>
                                </>
                              ) : (
                                <>
                                  You will receive <strong>{formatCurrency(breakdown.finalAmount)}</strong>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedRefundType.id === 'keep_item' && (
                        <div>
                          <div>You&apos;ll keep the item and can request up to <strong>{formatCurrency(maxPartialAmount)}</strong> (70% of item value).</div>
                          {selectedRefundMethod && (
                            <div className="text-xs text-gray-600 mt-1">
                              {breakdown.fee > 0 ? (
                                <>
                                  Fee ({selectedRefundMethod.label}): <strong>{formatCurrency(breakdown.fee)}</strong> — You will receive <strong>{formatCurrency(breakdown.finalAmount)}</strong>
                                </>
                              ) : (
                                <>
                                  You will receive <strong>{formatCurrency(breakdown.finalAmount)}</strong>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedRefundType.id === 'replacement' && (
                        <span>You'll return the item and receive a replacement</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Refund Method Selection */}
              {selectedRefundType && (
                <div className="space-y-4">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Refund Method
                  </p>
                  
                  <CustomDropdown
                    value={selectedRefundMethod?.id || ''}
                    onChange={handleRefundMethodSelect}
                    options={getAvailableMethods().map(method => ({
                      id: method.id,
                      label: method.label,
                      icon: method.icon,
                      description: method.description
                    }))}
                    placeholder="Select refund method"
                    icon={CreditCard}
                    label="How do you want to receive your refund?"
                  />
                  
                  {selectedRefundMethod && (
                    <div className="mt-4 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <selectedRefundMethod.icon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{selectedRefundMethod.label}</p>
                            <p className="text-xs text-gray-500">{selectedRefundMethod.description}</p>
                            <div className="text-xs text-gray-600 mt-1">
                              {breakdown.fee > 0 ? (
                                <>
                                  Fee ({selectedRefundMethod.type === 'moneyback' ? 'Remittance' : selectedRefundMethod.type === 'wallet' ? 'E-Wallet' : selectedRefundMethod.type}): <strong>{formatCurrency(breakdown.fee)}</strong>
                                  <span className="mx-1">•</span>
                                  Net: <strong>{formatCurrency(breakdown.finalAmount)}</strong>
                                </>
                              ) : (
                                <>Net: <strong>{formatCurrency(breakdown.finalAmount)}</strong></>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {selectedRefundMethod.type === 'wallet' ? 'E-Wallet' :
                           selectedRefundMethod.type === 'bank' ? 'Bank Transfer' :
                           selectedRefundMethod.type === 'voucher' ? 'Store Voucher' :
                           selectedRefundMethod.type === 'moneyback' ? 'Remittance' : 'Replacement'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Compact Refund Amount Card */}
                  {selectedRefundMethod && (
                    <div className="mt-3">
                      <Card className="border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Refund Amount</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Refund to {selectedRefundMethod.type === 'wallet' ? 'Wallet' : selectedRefundMethod.type === 'moneyback' ? 'Remittance' : (selectedRefundMethod.type === 'bank' ? 'Bank' : 'Store Voucher')}</p>
                              <p className="text-xs text-gray-500">{selectedRefundMethod.type === 'wallet' ? 'Get refund to your e-wallet' : selectedRefundMethod.type === 'moneyback' ? 'Get refund via remittance' : selectedRefundMethod.type === 'bank' ? 'Get refund via bank transfer' : 'Get refund as store voucher'}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Fee ({selectedRefundMethod.type === 'wallet' ? 'E-Wallet' : selectedRefundMethod.type === 'moneyback' ? 'Remittance' : selectedRefundMethod.type}):</div>
                              <div className="font-medium">{formatCurrency(breakdown.fee)}</div>
                              <div className="text-xs text-gray-500 mt-1">Net:</div>
                              <div className="font-medium">{formatCurrency(breakdown.finalAmount)}</div>
                            </div>
                          </div>

                          {/* When refund type is partial (keep_item), show max partial and quick input here */}
                          {selectedRefundType?.id === 'keep_item' && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2 text-center">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Full Amount</div>
                                  <div className="font-medium text-sm">{formatCurrency(fullAmount)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Max Partial (70%)</div>
                                  <div className="font-medium text-sm text-amber-600">{formatCurrency(maxPartialAmount)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Your Request</div>
                                  <div className="font-medium text-sm text-green-600">{partialAmount ? formatCurrency(parseFloat(partialAmount)) : '₱0.00'}</div>
                                </div>
                              </div>

                              <div className="relative max-w-xs mx-auto">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                                <input
                                  type="number"
                                  value={partialAmount}
                                  onChange={(e) => setPartialAmount(e.target.value)}
                                  className="w-full pl-8 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  placeholder={formatCurrency(maxPartialAmount)}
                                  min="1"
                                  max={maxPartialAmount}
                                  step="0.01"
                                />
                              </div>

                              {partialAmount && parseFloat(partialAmount) > maxPartialAmount && (
                                <p className="text-sm text-red-600 mt-1">Amount cannot exceed {formatCurrency(maxPartialAmount)}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Payment Method Form */}
                  {getPaymentForm()}



                  {/* Voucher/Replacement Information */}
                  {selectedRefundMethod?.type === 'voucher' && (
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

                  {selectedRefundMethod?.type === 'replace' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-medium text-green-800">Replacement Information</p>
                      </div>
                      <p className="text-sm text-green-700">
                        A replacement item will be shipped once we receive and verify the returned item.
                        Please allow 7-14 business days for processing.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Return Reason */}
              <div>
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Reason for Return
                </p>
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
                    <ChevronDown className="h-4 h-4" />
                  </div>
                </div>
                
                {returnReason && returnReason === 'Other' && (
                  <Textarea
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    placeholder="Please specify your reason for return..."
                    className="w-full mt-3 min-h-[80px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                )}
                
                {returnReason && returnReason !== 'Other' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-800">Selected: <span className="font-medium">{returnReason}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              {returnReason && returnReason !== 'Other' && (
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Details (Optional)
                  </p>
                  <Textarea
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    placeholder="Please provide any additional details about your return request (e.g., specific issues, photos description)..."
                    className="w-full min-h-[100px] p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              )}

              {/* Upload Photos */}
              <div>
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Evidence (Optional)
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Upload photos or videos showing the issue. Max 4 files, 5MB each.
                  Supported formats: JPG, PNG, GIF, MP4, MOV.
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
                    <div className={`w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
                      images.length >= 4 
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer'
                    } transition-colors`}>
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">{images.length}/4</span>
                    </div>
                  </label>

                  {/* Image Previews */}
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-20 h-20 rounded-lg border overflow-hidden">
                        <img
                          src={image}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImageRemove(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        Evidence {index + 1}
                      </div>
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
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium">{order.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date:</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items:</span>
                <span>{order.items.length} items</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-medium">{formatCurrency(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Refund Summary */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Refund Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Selected:</span>
                  <span className="font-medium">{selectedItems.length} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">{formatCurrency(fullAmount)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Refund Type:</span>
                  {selectedRefundType ? (
                    <Badge variant="outline" className={`text-xs ${
                      selectedRefundType.id === 'return_item' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedRefundType.id === 'keep_item'
                        ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {selectedRefundType.label}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">Not selected</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Refund Method:</span>
                  {selectedRefundMethod ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {selectedRefundMethod.label.split('(')[0].trim()}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">Not selected</span>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Amount:</span>
                  <span className={`font-bold text-sm ${
                    refundAmount > 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {refundAmount > 0 ? formatCurrency(refundAmount) : '₱0.00'}
                  </span>
                </div>
                
                {selectedRefundType?.id === 'return_item' && (
                  <div className="text-xs text-gray-500">
                    Full refund of selected items
                  </div>
                )}
                
                {selectedRefundType?.id === 'keep_item' && (
                  <div className="text-xs text-gray-500">
                    {partialAmount ? `${formatCurrency(parseFloat(partialAmount))} / ${formatCurrency(maxPartialAmount)} (max)` : 'Enter amount above'}
                  </div>
                )}
                
                {selectedRefundType?.id === 'replacement' && (
                  <div className="text-xs text-gray-500">
                    No monetary refund - replacement only
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Return Policy */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Return Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <Package className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>7-day return window from delivery date</span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Items must be in original condition with all accessories</span>
                </div>
                <div className="flex items-start gap-2">
                  <Banknote className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Refunds processed within 3-5 business days after approval</span>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>Free return shipping for damaged/wrong items</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Request */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Submit Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-600 mb-2">
                By submitting, you agree to our return policy and confirm that the information provided is accurate.
              </div>
              
              <Button
                onClick={handleSubmitReturn}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                size="default"
                disabled={
                  loading ||
                  selectedItems.length === 0 || 
                  !selectedRefundType || 
                  !selectedRefundMethod || 
                  !isPaymentDetailsValid() ||
                  !returnReason ||
                  (selectedRefundType.id === 'keep_item' && (!partialAmount || parseFloat(partialAmount) > maxPartialAmount))
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Submit Return Request
                  </>
                )}
              </Button>
              
              <div className="pt-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start h-9 text-sm"
                  onClick={() => navigate(`/view-order/${order.order_id}`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Order Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start h-9 text-sm mt-2"
                  onClick={() => {
                    const shopId = selectedItemsDetails[0]?.shop_id;
                    if (shopId) {
                      navigate(`/chat/seller/${shopId}`, {
                        state: { orderId: order.order_id }
                      });
                    } else {
                      setError('Please select an item first to contact the seller');
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  disabled={selectedItems.length === 0}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start h-9 text-sm mt-2"
                  onClick={() => navigate('/help/returns')}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Need Help?
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              {user.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate max-w-[150px]">{user.email}</span>
                </div>
              )}
              <div className="pt-2 text-xs text-gray-500">
                This request will be linked to your account.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}