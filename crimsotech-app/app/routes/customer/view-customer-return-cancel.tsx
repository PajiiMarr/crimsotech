"use client";
import React, { useState } from 'react';
import type { Route } from './+types/view-customer-return-cancel';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Breadcrumbs from "~/components/ui/breadcrumbs";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Image as ImageIcon,
  User,
  Hash,
  XCircle,
  MessageCircle,
  ShoppingBag,
  CreditCard,
  ChevronDown,
  PhilippinePeso,
  Truck,
  Package,
  Store,
  MapPin,
  Phone,
  Mail,
  Home,
  Truck as ShippingIcon,
  Package as PackageIcon,
  ShoppingCart,
  Tag,
  AlertCircle,
  RotateCcw,
  List,
  Eye,
  Printer,
  Copy,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Edit,
  Banknote,
  Building,
  Navigation,
  Share2,
  Star,
  HelpCircle,
  FileQuestion,
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckSquare,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Minus,
  MessageSquareReply,
  FileCheck,
  Receipt,
  Wallet,
  ShoppingBasket,
  Archive,
  Award,
  Briefcase,
  Check,
  ChevronRight,
  PackageCheck,
  FileSearch,
  FileUp,
  ArrowUpRight,
  PackageX,
  ShieldCheck,
  PackageOpen,
  ShieldX,
  ClipboardCheck,
  ArrowUpDown,
  CalendarClock,
  CreditCard as CardIcon,
  FileBox,
  HardDriveUpload,
  Clock4,
  UserCheck,
  UserX,
  MailCheck,
  MailX,
  PackagePlus,
  PackageMinus,
  Loader2,
  RefreshCcwDot,
  TrendingUp,
  TrendingDown,
  Circle,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleDashed,
  Activity,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bot,
  Box,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Camera,
  CheckCheck,
  ChevronLeft,
  ChevronsUpDown,
  CircleHelp,
  CloudUpload,
  Coins,
  CornerDownRight,
  CornerUpLeft,
  DollarSign,
  FileDigit,
  FileInput,
  FileOutput,
  FileSpreadsheet,
  FileStack,
  FolderArchive,
  FolderOpen,
  Gift,
  Handshake,
  Headphones,
  History,
  Info,
  Key,
  Layers,
  LifeBuoy,
  Link,
  Lock,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  Monitor,
  Paperclip,
  Pause,
  PauseCircle,
  Percent,
  PhoneCall,
  PieChart,
  Play,
  PlayCircle,
  PlusCircle,
  QrCode,
  Radio,
  Repeat,
  RotateCw,
  Save,
  Scan,
  ScanBarcode,
  ScanLine,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldOff,
  ShoppingCart as CartIcon,
  SkipBack,
  SkipForward,
  Smartphone,
  Speaker,
  Square,
  SquareCheck,
  SquarePen,
  StarHalf,
  StopCircle,
  Tablet,
  Terminal,
  Thermometer,
  Timer,
  TimerReset,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Trophy,
  Tv,
  Umbrella,
  Unlock,
  UploadCloud,
  UserPlus,
  Users,
  Video,
  Volume2,
  Wifi,
  WifiOff,
  Zap,
  ZapOff,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

// --- Component Metadata ---
export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Refund & Return Request",
    },
  ];
}

// --- Status Configuration for Return Requests ---
const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: Clock,
    description: 'Waiting for seller to review your request',
    customerAction: 'Seller will review within 48 hours',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'current', icon: Clock },
      { label: 'Seller Response', status: 'pending', icon: MessageCircle },
      { label: 'Return Process', status: 'pending', icon: Package },
      { label: 'Refund Process', status: 'pending', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: MessageCircle,
    description: 'Negotiating terms with seller',
    customerAction: 'Respond to seller\'s offer',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Seller Response', status: 'current', icon: MessageCircle },
      { label: 'Your Response', status: 'pending', icon: MessageSquareReply },
      { label: 'Return Process', status: 'pending', icon: Package },
      { label: 'Refund Process', status: 'pending', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
    description: 'Return request approved by seller',
    customerAction: 'Prepare item for return shipping',
    progress: 3,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Prepare Return', status: 'current', icon: Package },
      { label: 'Schedule Pickup', status: 'pending', icon: Truck },
      { label: 'Item Verification', status: 'pending', icon: PackageCheck },
      { label: 'Refund Process', status: 'pending', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  waiting: {
    label: 'Waiting For Return',
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    icon: Package,
    description: 'Waiting for you to return the item',
    customerAction: 'Return item within 7 days',
    progress: 4,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Prepare Return', status: 'completed', icon: Package },
      { label: 'Schedule Pickup/Drop-off', status: 'current', icon: Truck },
      { label: 'In Transit', status: 'pending', icon: ShippingIcon },
      { label: 'Item Verification', status: 'pending', icon: PackageCheck },
      { label: 'Refund Process', status: 'pending', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  to_verify: {
    label: 'To Verify',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    icon: PackageCheck,
    description: 'Seller received item, verifying condition',
    customerAction: 'Seller will verify within 3 days',
    progress: 6,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Item Returned', status: 'completed', icon: Package },
      { label: 'In Transit', status: 'completed', icon: ShippingIcon },
      { label: 'Item Received', status: 'completed', icon: Package },
      { label: 'Verification', status: 'current', icon: PackageCheck },
      { label: 'Refund Process', status: 'pending', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  to_process: {
    label: 'To Process',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    icon: RefreshCw,
    description: 'Ready for refund processing',
    customerAction: 'Refund will be processed soon',
    progress: 7,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Item Returned', status: 'completed', icon: Package },
      { label: 'In Transit', status: 'completed', icon: ShippingIcon },
      { label: 'Item Verified', status: 'completed', icon: PackageCheck },
      { label: 'Refund Processing', status: 'current', icon: Banknote },
      { label: 'Completed', status: 'pending', icon: CheckSquare },
    ]
  },
  dispute: {
    label: 'Dispute',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    icon: AlertTriangle,
    description: 'Under admin review',
    customerAction: 'Awaiting admin decision',
    progress: 3,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Dispute Filed', status: 'current', icon: AlertTriangle },
      { label: 'Admin Review', status: 'pending', icon: ShieldAlert },
      { label: 'Resolution', status: 'pending', icon: CheckCheck },
    ]
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    icon: CheckSquare,
    description: 'Return and refund completed',
    customerAction: 'Process finished successfully',
    progress: 9,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Approval Received', status: 'completed', icon: CheckCircle },
      { label: 'Item Returned', status: 'completed', icon: Package },
      { label: 'Item Verified', status: 'completed', icon: PackageCheck },
      { label: 'Refund Processed', status: 'completed', icon: Banknote },
      { label: 'Completed', status: 'current', icon: CheckSquare },
    ]
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 hover:bg-red-100',
    icon: XCircle,
    description: 'Request rejected by seller',
    customerAction: 'Request denied, contact seller for details',
    progress: 2,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Seller Review', status: 'completed', icon: CheckCircle },
      { label: 'Rejected', status: 'current', icon: XCircle },
    ]
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    icon: Ban,
    description: 'Request cancelled',
    customerAction: 'Request cancelled',
    progress: 1,
    timeline: [
      { label: 'Request Submitted', status: 'completed', icon: CheckCircle },
      { label: 'Cancelled', status: 'current', icon: Ban },
    ]
  }
};

// --- Types ---
interface ReturnItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
  image_url?: string;
  reason: string;
  condition: 'defective' | 'wrong_item' | 'not_as_described' | 'changed_mind' | 'damaged' | 'other';
  return_type: 'refund' | 'replacement' | 'store_credit';
  evidence_photos?: string[];
}

interface ShippingInfo {
  method: 'pickup' | 'dropoff';
  pickup_address?: {
    street: string;
    city: string;
    province: string;
    zip_code: string;
    contact_person: string;
    contact_phone: string;
  };
  dropoff_point?: string;
  tracking_number?: string;
  courier?: string;
  estimated_delivery: string;
}

interface PaymentInfo {
  method: 'original_payment' | 'wallet' | 'bank_transfer' | 'store_credit';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  transaction_id?: string;
  refunded_at?: string;
}

interface NegotiationMessage {
  id: string;
  sender: 'customer' | 'seller' | 'admin';
  message: string;
  timestamp: string;
  attachments?: string[];
}

interface ReturnRequest {
  id: string;
  request_number: string;
  order_id: string;
  order_number: string;
  user_id: string;
  shop_id: string;
  shop_name: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'negotiation' | 'approved' | 'waiting' | 'to_verify' | 'to_process' | 'dispute' | 'completed' | 'rejected' | 'cancelled';
  items: ReturnItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
  total_refund_amount: number;
  reason: string;
  customer_note?: string;
  seller_response?: string;
  admin_response?: string;
  negotiation_messages?: NegotiationMessage[];
  evidence_count: number;
  deadline?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface ReturnDetails {
  returnRequest: ReturnRequest;
  customer: Customer;
}

// --- Loader ---
export async function loader({ params, request }: Route.LoaderArgs) {
  const { returnId } = params as { returnId: string };
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const action = url.searchParams.get('action');

  // Mock data for return request
  const returnDetails: ReturnDetails = {
    returnRequest: {
      id: returnId || "REF-2024-00123",
      request_number: `RR-${Date.now().toString().slice(-6)}`,
      order_id: "ORD-2024-00123",
      order_number: "ORD-789456",
      user_id: 'user-123',
      shop_id: 'shop-001',
      shop_name: 'TechWorld Shop',
      created_at: '2024-01-20T10:30:00Z',
      updated_at: '2024-01-22T14:30:00Z',
      status: (status as any) || 'negotiation',
      total_refund_amount: 45000,
      reason: 'Product defective - screen has dead pixels upon arrival',
      customer_note: 'Please process refund as soon as possible',
      seller_response: 'We can offer 50% refund for you to keep the item, or full refund upon return.',
      evidence_count: 4,
      deadline: '2024-01-25T10:30:00Z',
      items: [
        {
          id: 'item-001',
          product_id: 'prod-001',
          name: 'Apple iPhone 13 Pro 256GB',
          price: 45000,
          quantity: 1,
          color: 'Black',
          image_url: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=400&h=400&fit=crop',
          reason: 'Screen has multiple dead pixels visible on dark backgrounds',
          condition: 'defective',
          return_type: 'refund',
          evidence_photos: [
            'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop'
          ]
        }
      ],
      shipping: {
        method: 'pickup',
        pickup_address: {
          street: '123 Main Street, Unit 4B',
          city: 'Manila',
          province: 'Metro Manila',
          zip_code: '1000',
          contact_person: 'Juan Dela Cruz',
          contact_phone: '+63 912 345 6789',
        },
        dropoff_point: 'J&T Express Branch - SM Manila',
        tracking_number: 'TRK-RET-789012',
        courier: 'J&T Express',
        estimated_delivery: '2024-01-23',
      },
      payment: {
        method: 'wallet',
        status: 'pending',
        amount: 45000,
        transaction_id: 'REF-789456123',
      },
      negotiation_messages: [
        {
          id: 'msg-1',
          sender: 'customer',
          message: 'I received the phone yesterday and noticed several dead pixels on the screen. This is clearly a manufacturing defect.',
          timestamp: '2024-01-20T10:30:00Z',
          attachments: ['dead_pixel_1.jpg', 'dead_pixel_2.jpg']
        },
        {
          id: 'msg-2',
          sender: 'seller',
          message: 'We apologize for the inconvenience. Can you send more clear photos of the issue? We can offer a partial refund if you choose to keep the item.',
          timestamp: '2024-01-20T14:30:00Z'
        },
        {
          id: 'msg-3',
          sender: 'customer',
          message: 'Here are more photos showing the dead pixels clearly. I prefer a full refund as the phone is defective.',
          timestamp: '2024-01-21T09:15:00Z',
          attachments: ['pixel_issue_1.jpg', 'pixel_issue_2.jpg']
        },
        {
          id: 'msg-4',
          sender: 'seller',
          message: 'We can offer 50% refund for you to keep the item, or full refund upon return. Please let us know your decision.',
          timestamp: '2024-01-22T10:30:00Z'
        }
      ]
    },
    customer: {
      id: 'user-123',
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@example.com',
      phone: '+63 912 345 6789',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    }
  };

  return {
    user: {
      id: "demo-customer-123",
      name: "Juan Dela Cruz",
      email: "customer@example.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: false,
      username: "juan_customer",
    },
    returnDetails,
    action: action || null
  };
}

// --- Status-Specific UI Components ---

function PendingStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.pending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Order #{returnRequest.order_number} • Requested on {formatDate(returnRequest.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Waiting for Seller Review</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your return request has been submitted. The seller will review it within 48 hours.
              </AlertDescription>
            </Alert>

            {/* Return Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Request Date
                </p>
                <p className="font-medium text-sm">{formatDate(returnRequest.created_at)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items
                </p>
                <p className="font-medium text-sm">{returnRequest.items.length} item(s)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  Refund Method
                </p>
                <p className="font-medium text-sm capitalize">{returnRequest.payment.method.replace('_', ' ')}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response Deadline
                </p>
                <p className="font-medium text-sm text-yellow-600">
                  {returnRequest.deadline ? formatDate(returnRequest.deadline) : '48 hours'}
                </p>
              </div>
            </div>

            {/* Return Items */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Package className="h-3 w-3" />
                Items to Return ({returnRequest.items.length})
              </p>
              <div className="space-y-2">
                {returnRequest.items.map((item: any) => (
                  <div key={item.id} className="p-3 border rounded space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.return_type === 'refund' ? 'Refund' :
                             item.return_type === 'replacement' ? 'Replacement' :
                             'Store Credit'}
                          </Badge>
                        </div>
                      </div>
                      <div className="font-medium text-sm">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                    
                    {/* Return Details */}
                    <div className="pl-14 space-y-2 border-t pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Reason:</p>
                          <p className="font-medium capitalize">{item.reason}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Condition:</p>
                          <p className="font-medium capitalize">{item.condition.replace('_', ' ')}</p>
                        </div>
                      </div>

                      {/* Evidence Photos */}
                      {item.evidence_photos && item.evidence_photos.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Evidence Photos:</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {item.evidence_photos.map((photo: string, index: number) => (
                              <div key={index} className="w-12 h-12 flex-shrink-0 border rounded overflow-hidden">
                                <img
                                  src={photo}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shop Information */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs font-medium text-gray-800 mb-2">Shop Information</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Store className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{returnRequest.shop_name}</p>
                    <p className="text-xs text-gray-700">Return processing: 3-5 business days</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Response Time:</p>
                    <p className="font-medium">Within 48 hours</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Return Policy:</p>
                    <p className="font-medium">30-day window</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Refund Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Price:</span>
              <span>{formatCurrency(returnRequest.items[0].price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span>{returnRequest.items[0].quantity}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Total Refund:</span>
              <span className="text-green-600">{formatCurrency(returnRequest.total_refund_amount)}</span>
            </div>
            
            <div className="pt-2 mt-2 border-t">
              <p className="text-muted-foreground">Refund Method:</p>
              <div className="flex items-center gap-2 mt-1 text-sm">
                {returnRequest.payment.method === 'wallet' && <Wallet className="h-3 w-3 text-blue-600" />}
                {returnRequest.payment.method === 'original_payment' && <CreditCard className="h-3 w-3 text-purple-600" />}
                {returnRequest.payment.method === 'bank_transfer' && <Building className="h-3 w-3 text-green-600" />}
                {returnRequest.payment.method === 'store_credit' && <Receipt className="h-3 w-3 text-orange-600" />}
                <span className="font-medium capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Return Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Return Requested ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-yellow-500" />
                <span className="font-medium">Seller Review</span>
                <Badge variant="outline" className="ml-auto bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Item Return</span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Refund Processing</span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t">
              <p className="text-muted-foreground">Expected Response:</p>
              <p className="font-medium">Within 48 hours</p>
            </div>
          </CardContent>
        </Card> */}

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/request-refund/edit/${returnRequest.id}`)}
            >
              <Edit className="h-3 w-3 mr-1.5" />
              Edit Request
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/request-refund/cancel/${returnRequest.id}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Cancel Request
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/faq/returns`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Return FAQ
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Help?</p>
                <p className="text-xs text-blue-700 mt-1">
                  Seller has 48 hours to respond. You'll be notified once they review your request.
                </p>
                <Button
                  variant="link"
                  className="h-6 px-0 text-xs text-blue-700 mt-1"
                  onClick={() => navigate('/support/returns')}
                >
                  Contact Support →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NegotiationStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.negotiation;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Order #{returnRequest.order_number} • Under negotiation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-blue-50 border-blue-200">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Negotiation in Progress</AlertTitle>
              <AlertDescription className="text-blue-700">
                The seller has responded to your request. Review their offer and respond.
              </AlertDescription>
            </Alert>

            {/* Return Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Request Date
                </p>
                <p className="font-medium text-sm">{formatDate(returnRequest.created_at)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items
                </p>
                <p className="font-medium text-sm">{returnRequest.items.length} item(s)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  Original Refund
                </p>
                <p className="font-medium text-sm text-green-600">{formatCurrency(returnRequest.total_refund_amount)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response Deadline
                </p>
                <p className="font-medium text-sm text-yellow-600">
                  {returnRequest.deadline ? formatDate(returnRequest.deadline) : '48 hours'}
                </p>
              </div>
            </div>

            {/* Return Items */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Package className="h-3 w-3" />
                Items ({returnRequest.items.length})
              </p>
              <div className="space-y-2">
                {returnRequest.items.map((item: any) => (
                  <div key={item.id} className="p-3 border rounded space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.return_type === 'refund' ? 'Refund' :
                             item.return_type === 'replacement' ? 'Replacement' :
                             'Store Credit'}
                          </Badge>
                        </div>
                      </div>
                      <div className="font-medium text-sm">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                    
                    {/* Evidence Photos - Compact */}
                    {item.evidence_photos && item.evidence_photos.length > 0 && (
                      <div className="pl-14">
                        <p className="text-xs text-muted-foreground mb-1">Evidence Photos:</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {item.evidence_photos.map((photo: string, index: number) => (
                            <div key={index} className="w-12 h-12 flex-shrink-0 border rounded overflow-hidden">
                              <img
                                src={photo}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Seller's Offer */}
            {returnRequest.seller_response && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Seller's Offer</p>
                        <p className="text-xs text-blue-700">From {returnRequest.shop_name}</p>
                      </div>
                      {returnRequest.deadline && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {formatDate(returnRequest.deadline)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{returnRequest.seller_response}</p>
                    
                    {/* Offer Details */}
                    {returnRequest.offer_details && (
                      <div className="mt-2 p-2 bg-white border border-blue-100 rounded">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {returnRequest.offer_details.partial_amount && (
                            <>
                              <span className="text-muted-foreground">Offered Amount:</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(returnRequest.offer_details.partial_amount)}
                              </span>
                            </>
                          )}
                          {returnRequest.offer_details.offer_type && (
                            <>
                              <span className="text-muted-foreground">Offer Type:</span>
                              <span className="font-medium capitalize">
                                {returnRequest.offer_details.offer_type.replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Compact */}
                    {/* <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                        onClick={() => navigate(`/negotiation/accept/${returnRequest.id}`)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                        Accept Offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => navigate(`/negotiation/counter/${returnRequest.id}`)}
                      >
                        <MessageSquareReply className="h-3 w-3 mr-1.5" />
                        Counter Offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs"
                        onClick={() => navigate(`/negotiation/reject/${returnRequest.id}`)}
                      >
                        <XCircle className="h-3 w-3 mr-1.5" />
                        Reject Offer
                      </Button>
                    </div> */}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          {/* <CardHeader className="pb-2">
            <CardTitle className="text-sm">Refund Summary</CardTitle>
          </CardHeader> */}
          {/* <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Amount:</span>
              <span>{formatCurrency(returnRequest.total_refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seller's Offer:</span>
              <span className="text-green-600">
                {returnRequest.offer_details?.partial_amount 
                  ? formatCurrency(returnRequest.offer_details.partial_amount)
                  : formatCurrency(returnRequest.total_refund_amount * 0.5)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Potential Refund:</span>
              <span className="text-green-600">
                {returnRequest.offer_details?.partial_amount 
                  ? formatCurrency(returnRequest.offer_details.partial_amount)
                  : formatCurrency(returnRequest.total_refund_amount * 0.5)}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">
              {returnRequest.offer_details?.offer_type === 'partial_refund' 
                ? 'Partial refund if you keep the item'
                : 'Seller\'s offer'}
            </p>
          </CardContent> */}
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs"
              onClick={() => navigate(`/negotiation/accept/${returnRequest.id}`)}
            >
              <CheckCircle className="h-3 w-3 mr-1.5" />
              Accept Seller's Offer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/negotiation/counter/${returnRequest.id}`)}
            >
              <MessageSquareReply className="h-3 w-3 mr-1.5" />
              Make Counter Offer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/negotiation/reject/${returnRequest.id}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Reject & Escalate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/faq/negotiations`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Negotiation Tips
            </Button>
          </CardContent>
        </Card>

        {/* <Card className="border">
          <CardHeader className="pb-2">
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
        </Card> */}

        {/* <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Help?</p>
                <p className="text-xs text-blue-700 mt-1">
                  Respond to the seller's offer before the deadline. You can accept, counter, or reject their proposal.
                </p>
                <Button
                  variant="link"
                  className="h-6 px-0 text-xs text-blue-700 mt-1"
                  onClick={() => navigate('/support/negotiations')}
                >
                  Contact Support →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}

function ApprovedStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.approved;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Approved on {formatDate(returnRequest.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Return Request Approved!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your return request has been approved. Please prepare the item for return within 7 days.
              </AlertDescription>
            </Alert>

            {/* Return Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Return Instructions
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Return Method:</p>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-sm capitalize">{returnRequest.shipping.method}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Deadline:</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        {returnRequest.deadline ? formatDate(returnRequest.deadline) : 'Within 7 days'}
                      </span>
                    </div>
                  </div>
                </div>

                {returnRequest.shipping.method === 'pickup' && returnRequest.shipping.pickup_address && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Pickup Address:</p>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                      <p className="font-medium">{returnRequest.shipping.pickup_address.contact_person}</p>
                      <p>{returnRequest.shipping.pickup_address.street}</p>
                      <p>{returnRequest.shipping.pickup_address.city}, {returnRequest.shipping.pickup_address.province}</p>
                      <p className="flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {returnRequest.shipping.pickup_address.contact_phone}
                      </p>
                    </div>
                  </div>
                )}

                {returnRequest.shipping.method === 'dropoff' && returnRequest.shipping.dropoff_point && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Drop-off Point:</p>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                      <p className="font-medium">{returnRequest.shipping.dropoff_point}</p>
                      <p className="text-xs text-gray-500 mt-1">Business hours: 9AM - 6PM, Monday to Saturday</p>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Important Notes:</p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Include all original accessories and packaging</li>
                    <li>• Ensure item is in the same condition as when received</li>
                    <li>• Remove any personal data from the device</li>
                    <li>• Keep the return receipt for tracking</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Prepare Return Steps */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Next Steps
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-green-600">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Prepare the Item</p>
                    <p className="text-xs text-gray-600">Package the item securely with all accessories</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                    Ready
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-600">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Schedule Return</p>
                    <p className="text-xs text-gray-600">Arrange pickup or drop-off</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/schedule-return/${returnRequest.id}`)}
                  >
                    Schedule Now
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-400">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-500">Wait for Verification</p>
                    <p className="text-xs text-gray-400">Seller will verify item upon receipt</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Return Summary */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Return Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Item:</span>
                <span className="text-right">{returnRequest.items[0].name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Method:</span>
                <span className="capitalize">{returnRequest.shipping.method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deadline:</span>
                <span>{returnRequest.deadline ? formatDate(returnRequest.deadline) : '7 days'}</span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Status:</span>
              <Badge className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/schedule-return/${returnRequest.id}`)}
            >
              <Calendar className="h-3 w-3 mr-1.5" />
              Schedule Return
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/download-return-label/${returnRequest.id}`)}
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download Return Label
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/request-refund/cancel/${returnRequest.id}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Cancel Return
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-green-100 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Return Tips</p>
                <ul className="text-xs text-green-700 mt-1 space-y-1">
                  <li>• Take photos before packaging</li>
                  <li>• Use original packaging if available</li>
                  <li>• Keep tracking number safe</li>
                  <li>• Expect refund 3-5 days after verification</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WaitingStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.waiting;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Awaiting return
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-indigo-50 border-indigo-200">
              <Package className="h-4 w-4 text-indigo-600" />
              <AlertTitle className="text-indigo-800">Waiting for Return</AlertTitle>
              <AlertDescription className="text-indigo-700">
                Your return has been scheduled. Please return the item before {returnRequest.deadline ? formatDate(returnRequest.deadline) : 'the deadline'}.
              </AlertDescription>
            </Alert>

            {/* Return Tracking */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-indigo-800 mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Return Tracking
              </h3>
              
              <div className="space-y-4">
                {/* Tracking Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Tracking Number:</p>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-indigo-600" />
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                        {returnRequest.shipping.tracking_number || 'Not assigned yet'}
                      </code>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Courier:</p>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm">{returnRequest.shipping.courier || 'To be assigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Pickup/Drop-off Details */}
                {returnRequest.shipping.method === 'pickup' && returnRequest.shipping.pickup_address && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Scheduled Pickup:</p>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Address:</span>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">
                          {returnRequest.shipping.estimated_delivery}
                        </Badge>
                      </div>
                      <p>{returnRequest.shipping.pickup_address.street}</p>
                      <p>{returnRequest.shipping.pickup_address.city}, {returnRequest.shipping.pickup_address.province}</p>
                      <p className="flex items-center gap-1 mt-2">
                        <User className="h-3 w-3" />
                        {returnRequest.shipping.pickup_address.contact_person}
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {returnRequest.shipping.pickup_address.contact_phone}
                      </p>
                    </div>
                  </div>
                )}

                {returnRequest.shipping.method === 'dropoff' && returnRequest.shipping.dropoff_point && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Drop-off Point:</p>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{returnRequest.shipping.dropoff_point}</span>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">
                          {returnRequest.shipping.estimated_delivery}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">Business hours: 9AM - 6PM, Monday to Saturday</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {returnRequest.shipping.tracking_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => navigate(`/track-return/${returnRequest.id}`)}
                    >
                      <Navigation className="h-3 w-3 mr-1.5" />
                      Track Return
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => navigate(`/update-return/${returnRequest.id}`)}
                  >
                    <Edit className="h-3 w-3 mr-1.5" />
                    Update Schedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1.5" />
                    Contact Seller
                  </Button>
                </div>
              </div>
            </div>

            {/* Return Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Return Progress
              </h3>
              <div className="space-y-3">
                {statusConfig.timeline.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-green-100 text-green-600' :
                      step.status === 'current' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'current' ? 'text-indigo-700' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        {step.status === 'current' && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {step.status === 'completed' ? 'Completed' :
                         step.status === 'current' ? 'In Progress - Return scheduled' :
                         'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Return Deadline */}
        <Card className="border border-indigo-100 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-indigo-800">Return Deadline</p>
                {returnRequest.deadline ? (
                  <div className="mt-1">
                    <p className="text-lg font-bold text-indigo-700">{formatDate(returnRequest.deadline)}</p>
                    <p className="text-xs text-indigo-600">
                      Please return the item before this date to avoid cancellation
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-indigo-700 mt-1">Within 7 days of approval</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Summary */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Return Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Item Value:</span>
                <span>{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Method:</span>
                <span className="capitalize">{returnRequest.shipping.method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Courier:</span>
                <span>{returnRequest.shipping.courier || 'To be assigned'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tracking:</span>
                <span>
                  {returnRequest.shipping.tracking_number ? (
                    <code className="font-mono text-xs">{returnRequest.shipping.tracking_number}</code>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Status:</span>
              <Badge className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {returnRequest.shipping.tracking_number && (
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => navigate(`/track-return/${returnRequest.id}`)}
              >
                <Navigation className="h-3 w-3 mr-1.5" />
                Track Return
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/download-return-label/${returnRequest.id}`)}
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download Label
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/update-return/${returnRequest.id}`)}
            >
              <Edit className="h-3 w-3 mr-1.5" />
              Update Schedule
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/request-refund/cancel/${returnRequest.id}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Cancel Return
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Help?</p>
                <p className="text-xs text-blue-700 mt-1">
                  If you need to change your return schedule or have questions, contact the seller or courier directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToVerifyStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.to_verify;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Item received, under verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-purple-50 border-purple-200">
              <PackageCheck className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-800">Item Received by Seller</AlertTitle>
              <AlertDescription className="text-purple-700">
                Your returned item has been received. The seller is now verifying its condition. This usually takes 1-3 business days.
              </AlertDescription>
            </Alert>

            {/* Verification Progress */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                Verification Status
              </h3>
              
              <div className="space-y-4">
                {/* Tracking Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Tracking Number:</p>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-purple-600" />
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                        {returnRequest.shipping.tracking_number}
                      </code>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Delivery Status:</p>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Delivered
                    </Badge>
                  </div>
                </div>

                {/* Verification Timeline */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Verification Steps:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Item Received</p>
                        <p className="text-xs text-gray-500">Seller confirmed receipt of package</p>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(returnRequest.updated_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <PackageCheck className="h-3 w-3 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Quality Inspection</p>
                        <p className="text-xs text-gray-500">Checking item condition and completeness</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                        In Progress
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <CheckCheck className="h-3 w-3 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Verification Complete</p>
                        <p className="text-xs text-gray-400">Final approval for refund</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expected Timeline */}
                <div className="bg-white border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Expected Completion:</p>
                      <p className="text-xs text-gray-600">Within 3 business days</p>
                    </div>
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                What Happens Next
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <PackageCheck className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Verification Process</p>
                    <p className="text-xs text-gray-600 mt-1">
                      The seller will check if the item is in acceptable condition, complete with all accessories, and matches the return reason.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Banknote className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Refund Initiation</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Once verified, the refund will be processed to your selected payment method within 3-5 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Completion</p>
                    <p className="text-xs text-gray-600 mt-1">
                      You'll receive a confirmation email once the refund is completed. The amount should appear in your account shortly after.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Verification Status */}
        <Card className="border border-purple-100 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <PackageCheck className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">Verification Timeline</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-700">Started:</span>
                    <span className="text-xs font-medium">{formatDate(returnRequest.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-700">Expected Complete:</span>
                    <span className="text-xs font-medium">Within 3 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-700">Status:</span>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                      In Progress
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Summary */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Expected Refund
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Item Value:</span>
                <span>{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Shipping:</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Restocking Fee:</span>
                <span className="text-green-600">None</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Refund:</span>
                <span className="text-green-600">{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Refund Method:</p>
              <div className="flex items-center gap-2 text-sm">
                {returnRequest.payment.method === 'wallet' && <Wallet className="h-4 w-4 text-blue-600" />}
                {returnRequest.payment.method === 'original_payment' && <CreditCard className="h-4 w-4 text-purple-600" />}
                {returnRequest.payment.method === 'bank_transfer' && <Building className="h-4 w-4 text-green-600" />}
                {returnRequest.payment.method === 'store_credit' && <Receipt className="h-4 w-4 text-orange-600" />}
                <span className="capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/track-return/${returnRequest.id}`)}
            >
              <Navigation className="h-3 w-3 mr-1.5" />
              View Tracking
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/faq/verification`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Verification FAQ
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Verification Note</p>
                <p className="text-xs text-blue-700 mt-1">
                  If the seller finds any issues with the returned item, they will contact you within 3 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToProcessStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.to_process;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Ready for refund processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-purple-50 border-purple-200">
              <RefreshCw className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-800">Ready for Refund Processing</AlertTitle>
              <AlertDescription className="text-purple-700">
                Your returned item has been verified. The refund is now being processed and should be completed within 3-5 business days.
              </AlertDescription>
            </Alert>

            {/* Refund Processing */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Refund Processing Details
              </h3>
              
              <div className="space-y-4">
                {/* Processing Steps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Item Verification Complete</p>
                      <p className="text-xs text-gray-500">Seller confirmed item is in acceptable condition</p>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(returnRequest.updated_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Refund Processing</p>
                      <p className="text-xs text-gray-500">Transferring funds to your account</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                      In Progress
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <CheckCheck className="h-3 w-3 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Refund Completed</p>
                      <p className="text-xs text-gray-400">Funds will appear in your account</p>
                    </div>
                  </div>
                </div>

                {/* Expected Timeline */}
                <div className="bg-white border rounded p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Expected Completion:</p>
                      <p className="text-sm font-medium">Within 5 business days</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Payment Method:</p>
                      <div className="flex items-center gap-2">
                        {returnRequest.payment.method === 'wallet' && <Wallet className="h-4 w-4 text-blue-600" />}
                        {returnRequest.payment.method === 'original_payment' && <CreditCard className="h-4 w-4 text-purple-600" />}
                        <span className="text-sm capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Refund Timeline
              </h3>
              <div className="space-y-3">
                {statusConfig.timeline.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-green-100 text-green-600' :
                      step.status === 'current' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'current' ? 'text-purple-700' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        {step.status === 'current' && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            Processing
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {step.status === 'completed' ? 'Completed' :
                         step.status === 'current' ? 'In Progress - Refund being processed' :
                         'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Refund Summary */}
        <Card className="border border-purple-100 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">Refund Amount</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(returnRequest.total_refund_amount)}</p>
                <p className="text-xs text-purple-600 mt-1">
                  Processing to your {returnRequest.payment.method.replace('_', ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Details */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Refund Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <code className="font-mono text-xs">{returnRequest.payment.transaction_id || 'Pending'}</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Processing Time:</span>
                <span>3-5 business days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                  Processing
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/view-receipt/${returnRequest.id}`)}
            >
              <Receipt className="h-3 w-3 mr-1.5" />
              View Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/faq/refunds`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Refund FAQ
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-green-100 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Processing Time</p>
                <p className="text-xs text-green-700 mt-1">
                  Refunds typically take 3-5 business days to process. The exact timing depends on your payment method and bank.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DisputeStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.dispute;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Under admin review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Dispute Filed</AlertTitle>
              <AlertDescription className="text-orange-700">
                This return request has been escalated to admin for review. A decision will be made within 5-7 business days.
              </AlertDescription>
            </Alert>

            {/* Dispute Details */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-800 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Dispute Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Dispute Reason:</p>
                    <p className="text-sm">Unable to reach agreement with seller</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Filed On:</p>
                    <p className="text-sm">{formatDate(returnRequest.updated_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Your Position:</p>
                  <div className="bg-white border rounded p-3">
                    <p className="text-sm">{returnRequest.reason}</p>
                    {returnRequest.customer_note && (
                      <p className="text-sm text-gray-600 mt-2">{returnRequest.customer_note}</p>
                    )}
                  </div>
                </div>

                {returnRequest.admin_response && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">Admin Response:</p>
                    </div>
                    <p className="text-sm text-blue-700">{returnRequest.admin_response}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dispute Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dispute Timeline
              </h3>
              <div className="space-y-3">
                {statusConfig.timeline.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-green-100 text-green-600' :
                      step.status === 'current' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'current' ? 'text-orange-700' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        {step.status === 'current' && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            Under Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {step.status === 'completed' ? 'Completed' :
                         step.status === 'current' ? 'Admin is reviewing the case' :
                         'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What to Expect */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">What to Expect</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">• Admin will review all evidence from both parties</p>
                <p className="text-gray-600">• Decision typically made within 5-7 business days</p>
                <p className="text-gray-600">• You'll be notified of the decision via email</p>
                <p className="text-gray-600">• Admin's decision is final and binding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Dispute Status */}
        <Card className="border border-orange-100 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Dispute Status</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-700">Status:</span>
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">
                      Under Review
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-700">Filed:</span>
                    <span className="text-xs font-medium">{formatDate(returnRequest.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-orange-700">Expected Decision:</span>
                    <span className="text-xs font-medium">5-7 business days</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Outcomes */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Potential Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">In Your Favor</p>
                  <p className="text-xs text-gray-600">Full refund processed immediately</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ThumbsUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Partial Settlement</p>
                  <p className="text-xs text-gray-600">Compromise amount agreed upon</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">In Seller's Favor</p>
                  <p className="text-xs text-gray-600">Return request denied</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/dispute/evidence/${returnRequest.id}`)}
            >
              <FileUp className="h-3 w-3 mr-1.5" />
              Add Evidence
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/support/contact`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Support
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/faq/disputes`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Dispute FAQ
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Help?</p>
                <p className="text-xs text-blue-700 mt-1">
                  For questions about the dispute process, contact our support team. Provide as much evidence as possible to support your case.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompletedStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.completed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Completed on {formatDate(returnRequest.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">Return Completed Successfully!</AlertTitle>
              <AlertDescription className="text-emerald-700">
                Your return and refund have been completed. Thank you for using our return service.
              </AlertDescription>
            </Alert>

            {/* Completion Summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completion Summary
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Refund Amount:</p>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(returnRequest.total_refund_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Completed On:</p>
                    <p className="text-sm">{formatDate(returnRequest.updated_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Transaction ID:</p>
                  <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                    {returnRequest.payment.transaction_id || 'REF-' + returnRequest.id.slice(-8)}
                  </code>
                </div>

                <div className="bg-white border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium">Refund Method:</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {returnRequest.payment.method === 'wallet' && <Wallet className="h-5 w-5 text-blue-600" />}
                    {returnRequest.payment.method === 'original_payment' && <CreditCard className="h-5 w-5 text-purple-600" />}
                    {returnRequest.payment.method === 'bank_transfer' && <Building className="h-5 w-5 text-green-600" />}
                    {returnRequest.payment.method === 'store_credit' && <Receipt className="h-5 w-5 text-orange-600" />}
                    <span className="text-sm capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Return Timeline
              </h3>
              <div className="space-y-3">
                {statusConfig.timeline.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                      step.status === 'current' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-emerald-700' :
                          step.status === 'current' ? 'text-emerald-700' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        {step.status === 'current' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {step.status === 'completed' || step.status === 'current' ? 'Completed' : 'Not required'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate Your Experience */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Rate Your Experience
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  How was your return experience? Your feedback helps us improve our service.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => navigate(`/rate-return/${returnRequest.id}`)}
                  >
                    <Star className="h-4 w-4 mr-1.5" />
                    Rate Return
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => navigate(`/rate-seller/${returnRequest.shop_id}`)}
                  >
                    <Store className="h-4 w-4 mr-1.5" />
                    Rate Seller
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Completion Card */}
        <Card className="border border-emerald-100 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckSquare className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-800">Return Completed</p>
              <p className="text-xs text-emerald-700 mt-1">
                Process finished successfully
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Refund Details */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Refund Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-emerald-700">{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Method:</span>
                <span className="capitalize">{returnRequest.payment.method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Completed
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <code className="font-mono text-xs">{returnRequest.payment.transaction_id?.slice(-8)}</code>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate(`/download-receipt/${returnRequest.id}`)}
              >
                <Download className="h-3 w-3 mr-1.5" />
                Download Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/shop/${returnRequest.shop_id}`)}
            >
              <Store className="h-3 w-3 mr-1.5" />
              Visit Shop Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/similar-products/${returnRequest.items[0].product_id}`)}
            >
              <ShoppingCart className="h-3 w-3 mr-1.5" />
              Shop Similar Items
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/request-refund-return`)}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              New Return Request
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Assistance?</p>
                <p className="text-xs text-blue-700 mt-1">
                  If you have any questions about your refund or need further assistance, please contact our support team.
                </p>
                <Button
                  variant="link"
                  className="h-6 px-0 text-xs text-blue-700 mt-2"
                  onClick={() => navigate('/support/contact')}
                >
                  Contact Support →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RejectedStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.rejected;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Rejected on {formatDate(returnRequest.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Return Request Rejected</AlertTitle>
              <AlertDescription className="text-red-700">
                Your return request has been rejected by the seller. {returnRequest.seller_response && `Reason: ${returnRequest.seller_response}`}
              </AlertDescription>
            </Alert>

            {/* Rejection Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Rejection Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Rejected On:</p>
                    <p className="text-sm">{formatDate(returnRequest.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">By:</p>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{returnRequest.shop_name}</span>
                    </div>
                  </div>
                </div>

                {returnRequest.seller_response && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Seller's Response:</p>
                    <div className="bg-white border rounded p-3">
                      <p className="text-sm">{returnRequest.seller_response}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Common Rejection Reasons:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Item not in original condition</li>
                    <li>• Return request outside policy period</li>
                    <li>• Missing accessories or packaging</li>
                    <li>• Evidence insufficient or unclear</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Your Options */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Your Options
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Contact Seller</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Discuss the rejection reason and see if there's a resolution.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1.5" />
                      Contact Seller
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">File a Dispute</p>
                    <p className="text-xs text-gray-600 mt-1">
                      If you believe the rejection is unfair, you can escalate to admin review.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate(`/file-dispute/${returnRequest.id}`)}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1.5" />
                      File Dispute
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Keep the Item</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Continue using the item or consider other options like reselling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Rejection Summary */}
        <Card className="border border-red-100 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Request Rejected</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-700">Status:</span>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                      Rejected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-700">Date:</span>
                    <span className="text-xs font-medium">{formatDate(returnRequest.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-700">By:</span>
                    <span className="text-xs font-medium">{returnRequest.shop_name}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Original Request */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Original Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Item:</span>
                <span>{returnRequest.items[0].name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Requested Amount:</span>
                <span>{formatCurrency(returnRequest.total_refund_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reason:</span>
                <span className="text-right">{returnRequest.reason}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${returnRequest.shop_id}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/file-dispute/${returnRequest.id}`)}
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              File Dispute
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/request-refund/new`)}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              New Return Request
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/faq/rejections`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Rejection FAQ
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Help?</p>
                <p className="text-xs text-blue-700 mt-1">
                  If you need assistance understanding the rejection or want to explore your options, contact our support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CancelledStatusUI({ returnDetails, formatDate, formatCurrency, navigate }: any) {
  const returnRequest = returnDetails.returnRequest;
  const statusConfig = STATUS_CONFIG.cancelled;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Request #{returnRequest.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{returnRequest.order_number} • Cancelled on {formatDate(returnRequest.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className="bg-gray-50 border-gray-200">
              <Ban className="h-4 w-4 text-gray-600" />
              <AlertTitle className="text-gray-800">Return Request Cancelled</AlertTitle>
              <AlertDescription className="text-gray-700">
                This return request has been cancelled. {returnRequest.seller_response && `Note: ${returnRequest.seller_response}`}
              </AlertDescription>
            </Alert>

            {/* Cancellation Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Cancellation Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Cancelled On:</p>
                    <p className="text-sm">{formatDate(returnRequest.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Request ID:</p>
                    <code className="text-sm font-mono">{returnRequest.request_number}</code>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Original Request:</p>
                  <div className="bg-white border rounded p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <img
                          src={returnRequest.items[0].image_url}
                          alt={returnRequest.items[0].name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{returnRequest.items[0].name}</p>
                        <p className="text-xs text-gray-500">Requested: {formatCurrency(returnRequest.total_refund_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Common Cancellation Reasons:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Customer changed their mind</li>
                    <li>• Found alternative solution with seller</li>
                    <li>• Decided to keep the item</li>
                    <li>• Missed return deadline</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                What's Next?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Continue Shopping</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Browse for other products or visit the seller's shop again.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate(`/shop/${returnRequest.shop_id}`)}
                    >
                      <Store className="h-3 w-3 mr-1.5" />
                      Visit Shop
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Create New Return Request</p>
                    <p className="text-xs text-gray-600 mt-1">
                      If you have a different issue, you can submit a new return request.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate(`/request-refund/new?order=${returnRequest.order_id}`)}
                    >
                      <Plus className="h-3 w-3 mr-1.5" />
                      New Request
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Get Help</p>
                    <p className="text-xs text-gray-600 mt-1">
                      If you have questions about the cancellation or need assistance.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => navigate('/support/contact')}
                    >
                      <MessageCircle className="h-3 w-3 mr-1.5" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Cancellation Summary */}
        <Card className="border border-gray-100 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Ban className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">Request Cancelled</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Status:</span>
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">
                      Cancelled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Date:</span>
                    <span className="text-xs font-medium">{formatDate(returnRequest.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Order:</span>
                    <span className="text-xs font-medium">{returnRequest.order_number}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0">
                <img
                  src={returnRequest.items[0].image_url}
                  alt={returnRequest.items[0].name}
                  className="w-full h-full object-cover rounded"
                />
              </div>
              <div>
                <p className="text-sm font-medium">{returnRequest.items[0].name}</p>
                <p className="text-xs text-gray-500">
                  {returnRequest.items[0].color && `Color: ${returnRequest.items[0].color}`}
                </p>
              </div>
            </div>
            <Separator />
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate(`/product/${returnRequest.items[0].product_id}`)}
              >
                <Eye className="h-3 w-3 mr-1.5" />
                View Product
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/shop/${returnRequest.shop_id}`)}
            >
              <Store className="h-3 w-3 mr-1.5" />
              Visit Shop
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/request-refund/new?order=${returnRequest.order_id}`)}
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              New Return Request
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/purchases`)}
            >
              <ShoppingBag className="h-3 w-3 mr-1.5" />
              View My Orders
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border border-blue-100 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Need Assistance?</p>
                <p className="text-xs text-blue-700 mt-1">
                  If you have questions about cancelled requests or need help with future returns, our support team is here to help.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Status UI mapping ---
const STATUS_UI_COMPONENTS = {
  pending: PendingStatusUI,
  negotiation: NegotiationStatusUI,
  approved: ApprovedStatusUI,
  waiting: WaitingStatusUI,
  to_verify: ToVerifyStatusUI,
  to_process: ToProcessStatusUI,
  dispute: DisputeStatusUI,
  completed: CompletedStatusUI,
  rejected: RejectedStatusUI,
  cancelled: CancelledStatusUI,
};

// --- Main Component ---
export default function ViewReturnRequest({ loaderData }: Route.ComponentProps) {
  const { user, returnDetails, action } = loaderData;
  const params = useParams<{ returnId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get status from URL query param
  const queryStatus = searchParams.get('status');
  
  // Use the status from the query parameter if available, otherwise use loader data's status
  const currentStatus = (queryStatus || returnDetails.returnRequest.status) as keyof typeof STATUS_CONFIG;

  // Update return status based on URL
  const returnRequest = {
    ...returnDetails.returnRequest,
    status: currentStatus,
    id: params.returnId || returnDetails.returnRequest.id
  };

  const returnId = returnRequest.id;
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
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRequestNumber = () => {
    navigator.clipboard.writeText(returnRequest.request_number);
    alert('Request number copied to clipboard!');
  };

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/customer-return-cancel')}
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to Return Requests</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Header with Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Return & Refund Request</h1>
              <p className="text-muted-foreground">Request #<strong>{returnRequest.request_number}</strong></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <Badge
              variant="secondary"
              className={`text-sm px-3 py-1.5 ${statusConfig?.color}`}
            >
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {statusConfig?.label}
            </Badge>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Request Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyRequestNumber}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Request Number
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/download-receipt/${returnRequest.id}`)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/share-return/${returnRequest.id}`)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status-Specific UI Section */}
        <StatusSpecificUI
          returnDetails={{ ...returnDetails, returnRequest }}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          navigate={navigate}
        />
      </div>
    </UserProvider>
  );
}