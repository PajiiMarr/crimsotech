"use client";
import React, { useState, useEffect } from 'react';
import type { Route } from './+types/view-customer-return-cancel';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { UserProvider } from '~/components/providers/user-role-provider';
import { useToast } from '~/hooks/use-toast';
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

// --- Types matching backend response ---
interface RefundItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    condition?: string;
    shop?: {
      id: string;
      name: string;
    };
    skus?: Array<{
      id: string;
      product_id: string;
      image: string;
      sku_code: string;
      price: number;
      option_ids: string[];
    }>;
    variants?: Array<{
      id: string;
      title: string;
      product_id: string;
      options: Array<{
        id: string;
        title: string;
        variant_id: string;
      }>;
    }>;
  };
  quantity: number;
  total_amount: number;
  status?: string;
}

interface Shop {
  id: string;
  name: string;
  is_suspended?: boolean;
}

interface RefundResponse {
  refund: string;
  request_number: string;
  order: {
    order: string;
    total_amount: number;
    payment_method?: string;
    delivery_address_text?: string;
  };
  requested_by: string;
  status: 'pending' | 'negotiation' | 'approved' | 'waiting' | 'to_verify' | 'to_process' | 'dispute' | 'completed' | 'rejected' | 'cancelled';
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  reason: string;
  total_refund_amount: number;
  preferred_refund_method?: string;
  final_refund_method?: string;
  customer_note?: string;
  seller_response?: string;
  admin_response?: string;
  
  // Timeline fields
  requested_at: string;
  negotiation_at?: string;
  approved_at?: string;
  buyer_notified_at?: string;
  buyer_return_deadline?: string;
  waiting_at?: string;
  to_verify_at?: string;
  verification_deadline?: string;
  to_process_at?: string;
  processing_deadline?: string;
  completed_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  
  // Negotiation fields
  seller_suggested_method?: string;
  seller_suggested_amount?: number;
  seller_suggested_reason?: string;
  negotiation_deadline?: string;
  
  // Dispute fields
  dispute_filed_at?: string;
  dispute_reason?: string;
  resolved_at?: string;
  
  // Evidence
  evidence: Array<{
    id: string;
    url: string;
    file_type: string;
  }>;
  evidence_count: number;
  is_negotiation_expired: boolean;
  
  // Order info
  order_info?: {
    order_number: string;
    order_id: string;
    total_amount: number;
    payment_method?: string;
    delivery_address_text?: string;
  };
  
  // Order items
  order_items: RefundItem[];
  
  // Shops
  shops: Shop[];
  
  // Delivery
  delivery?: {
    id: string;
    status: string;
    picked_at?: string;
    delivered_at?: string;
    tracking_number?: string;
    rider_id?: string;
  };
  
  // Available actions
  available_actions: string[];
  
  // Payment method details
  payment_method_details?: {
    wallet?: {
      id: string;
      provider: string;
      account_name: string;
      account_number: string;
      contact_number: string;
      created_at: string;
    };
    bank?: {
      id: string;
      bank_name: string;
      account_name: string;
      account_number: string;
      account_type: string;
      branch: string;
      created_at: string;
    };
    remittance?: {
      id: string;
      provider: string;
      first_name: string;
      last_name: string;
      full_name: string;
      contact_number: string;
      address: string;
      city: string;
      province: string;
      zip_code: string;
      valid_id_type: string;
      valid_id_number: string;
      created_at: string;
    };
  };
  
  // Additional properties
  payment_method_set: boolean;
  return_deadline?: string;
}

// --- Loader ---
export async function loader({ params, request }: Route.LoaderArgs) {
  const { returnId } = params as { returnId: string };
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const action = url.searchParams.get('action');

  // Basic validation
  if (!returnId) {
    throw new Response('return_id is required', { status: 400 });
  }

  try {
    const { registrationMiddleware } = await import('~/middleware/registration.server');
    await registrationMiddleware({ request, context: undefined, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import('~/middleware/role-require.server');
    await requireRole(request, undefined, ['isCustomer'] as any);
  } catch (err) {
    console.error('Loader middleware error', err);
  }

  // Resolve session and user ID
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId');

  if (!userId) {
    console.warn('No userId in session for return detail loader');
    throw new Response('Unauthorized', { status: 401 });
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const endpoint = `${API_BASE_URL}/return-refund/${returnId}/get_my_refund/`; 

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-User-Id': userId,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn('Failed to fetch refund detail', res.status);
      throw new Response('Failed to fetch refund detail', { status: res.status });
    }

    const refundData: RefundResponse = await res.json();

    return {
      user: { 
        id: userId, 
        name: 'Customer', 
        isCustomer: true, 
        isAdmin: false, 
        isRider: false, 
        isModerator: false, 
        username: 'customer', 
        email: '' 
      },
      refundData,
      action: action || null
    };

  } catch (err) {
    console.error('Error fetching refund detail', err);
    // Fallback to empty state
    return {
      user: { 
        id: userId, 
        name: 'Customer', 
        isCustomer: true, 
        isAdmin: false, 
        isRider: false, 
        isModerator: false, 
        username: 'customer', 
        email: '' 
      },
      refundData: null,
      action: action || null
    };
  }
}        

// --- Helper functions ---
function getShopName(refundData: RefundResponse): string {
  if (refundData.shops && refundData.shops.length > 0) {
    return refundData.shops[0].name;
  }
  
  // Fallback to first item's shop
  if (refundData.order_items && refundData.order_items.length > 0) {
    return refundData.order_items[0].product?.shop?.name || 'Unknown Shop';
  }
  
  return 'Unknown Shop';
}

function getShopId(refundData: RefundResponse): string {
  if (refundData.shops && refundData.shops.length > 0) {
    return refundData.shops[0].id;
  }
  
  // Fallback to first item's shop
  if (refundData.order_items && refundData.order_items.length > 0) {
    return refundData.order_items[0].product?.shop?.id || '';
  }
  
  return '';
}

function getOrderNumber(refundData: RefundResponse): string {
  if (refundData.order_info?.order_number) {
    return refundData.order_info.order_number;
  }
  
  if (refundData.order?.order) {
    return refundData.order.order;
  }
  
  return 'Unknown';
}

function getOrderTotal(refundData: RefundResponse): number {
  if (refundData.order_info?.total_amount) {
    return refundData.order_info.total_amount;
  }
  
  if (refundData.order?.total_amount) {
    return refundData.order.total_amount;
  }
  
  return 0;
}

// --- Status-Specific UI Components ---
function PendingStatusUI({ refundData, formatDate, formatCurrency, navigate, onCancel, actionLoading }: any) {
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
                Refund Request #{refundData.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Order #{getOrderNumber(refundData)} • Requested on {formatDate(refundData.requested_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Waiting for Seller Review</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your refund request has been submitted. The seller will review it within 48 hours.
              </AlertDescription>
            </Alert>

            {/* Refund Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Request Date
                </p>
                <p className="font-medium text-sm">{formatDate(refundData.requested_at)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items
                </p>
                <p className="font-medium text-sm">{refundData.order_items?.length || 0} item(s)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  Refund Method
                </p>
                <p className="font-medium text-sm capitalize">
                  {refundData.preferred_refund_method || 'Not specified'}
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Response Deadline
                </p>
                <p className="font-medium text-sm text-yellow-600">
                  48 hours
                </p>
              </div>

              {refundData.approved_at && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Approved on
                  </p>
                  <p className="font-medium text-sm">{formatDate(refundData.approved_at)}</p>
                </div>
              )}

              {refundData.buyer_return_deadline && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Return Deadline
                  </p>
                  <p className="font-medium text-sm text-blue-600">{formatDate(refundData.buyer_return_deadline)}</p>
                </div>
              )}
            </div>

            {/* Refund Items */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <Package className="h-3 w-3" />
                Items for Refund ({refundData.order_items?.length || 0})
              </p>
              <div className="space-y-2">
                {refundData.order_items?.map((item: RefundItem) => {
                  // Get variant label from SKUs
                  const sku = item.product?.skus?.[0];
                  const variantLabel = sku?.option_ids?.map((id: string) => {
                    const variant = item.product?.variants?.find(v => 
                      v.options.some(opt => opt.id === id)
                    );
                    if (variant) {
                      const option = variant.options.find(opt => opt.id === id);
                      return option?.title;
                    }
                    return null;
                  }).filter(Boolean).join(' • ');

                  return (
                    <div key={item.id} className="p-3 border rounded space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0">
                          <img
                            src={sku?.image || '/crimsonity.png'}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          {variantLabel && (
                            <div className="mt-2 text-sm text-gray-700">
                              <div>
                                <div className="text-xs text-muted-foreground">Variant</div>
                                <div className="font-medium">{variantLabel}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {sku?.sku_code ? `SKU: ${sku.sku_code}` : null}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="font-medium text-sm">
                          {formatCurrency(item.product.price)}
                        </div>
                      </div>

                      {/* Shop Info */}
                      {item.product.shop && (
                        <div className="pl-14 space-y-2 border-t pt-2">
                          <div className="text-xs">
                            <p className="text-muted-foreground">Shop:</p>
                            <p className="font-medium">{item.product.shop.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason for Refund */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs font-medium text-gray-800 mb-2">Reason for Refund</p>
              <p className="text-sm text-gray-700">{refundData.reason}</p>
              {refundData.customer_note && (
                <p className="text-sm text-gray-600 mt-2">{refundData.customer_note}</p>
              )}
            </div>

            {/* Evidence */}
            {refundData.evidence && refundData.evidence.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Evidence ({refundData.evidence_count})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {refundData.evidence.map((evidence: any) => (
                    <div key={evidence.id} className="w-16 h-16 flex-shrink-0 border rounded overflow-hidden">
                      <img
                        src={evidence.url}
                        alt="Evidence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <span className="text-muted-foreground">Order Total:</span>
              <span>{formatCurrency(getOrderTotal(refundData))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Amount:</span>
              <span>{formatCurrency(refundData.total_refund_amount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Status:</span>
              <span className={statusConfig.color.replace('hover:bg-', 'bg-') + " px-2 py-1 rounded text-xs"}>
                {statusConfig.label}
              </span>
            </div>
            
            <div className="pt-2 mt-2 border-t">
              <p className="text-muted-foreground">Refund Method:</p>
              <div className="flex items-center gap-2 mt-1 text-sm">
                {refundData.preferred_refund_method?.includes('wallet') && <Wallet className="h-3 w-3 text-blue-600" />}
                {refundData.preferred_refund_method?.includes('bank') && <Building className="h-3 w-3 text-green-600" />}
                {refundData.preferred_refund_method?.includes('money') && <Receipt className="h-3 w-3 text-orange-600" />}
                <span className="font-medium capitalize">
                  {refundData.preferred_refund_method || 'Not specified'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shop Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{getShopName(refundData)}</p>
                <p className="text-xs text-gray-700">Response time: Within 48 hours</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/shop/${getShopId(refundData)}`)}
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View Shop
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${getShopId(refundData)}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/upload-evidence/${refundData.refund}`)}
            >
              <Upload className="h-3 w-3 mr-1.5" />
              Add More Evidence
            </Button>
            {refundData.available_actions?.includes('cancel_request') && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancel(refundData.refund)}
                disabled={actionLoading}
              >
                <XCircle className="h-3 w-3 mr-1.5" />
                Cancel Request
              </Button>
            )}
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

function CompletedStatusUI({ refundData, formatDate, formatCurrency, navigate }: any) {
  const statusConfig = STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refundData.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{getOrderNumber(refundData)} • Completed on {formatDate(refundData.completed_at || refundData.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Refund Completed Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                Your refund has been processed and completed. The amount has been refunded to your account.
              </AlertDescription>
            </Alert>

            {/* Refund Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Refund Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Refund Amount:</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(refundData.total_refund_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Refund Method:</p>
                    <p className="text-sm capitalize">{refundData.final_refund_method || refundData.preferred_refund_method}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Completed Date:</p>
                    <p className="text-sm">{formatDate(refundData.completed_at || refundData.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Processing Time:</p>
                    <p className="text-sm">3-5 business days</p>
                  </div>
                </div>
                
                {/* Payment Method Details */}
                {refundData.payment_method_details && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Refund sent to:</p>
                    <div className="bg-white border rounded p-3">
                      {refundData.payment_method_details.wallet && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Wallet</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Provider: {refundData.payment_method_details.wallet.provider}</p>
                            <p>Account: {refundData.payment_method_details.wallet.account_name}</p>
                          </div>
                        </div>
                      )}
                      {refundData.payment_method_details.bank && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Bank Transfer</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Bank: {refundData.payment_method_details.bank.bank_name}</p>
                            <p>Account: {refundData.payment_method_details.bank.account_name}</p>
                            <p>Number: {refundData.payment_method_details.bank.account_number}</p>
                          </div>
                        </div>
                      )}
                      {refundData.payment_method_details.remittance && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">Remittance</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p>Provider: {refundData.payment_method_details.remittance.provider}</p>
                            <p>Name: {refundData.payment_method_details.remittance.full_name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shop Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Shop Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Store className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getShopName(refundData)}</p>
                    <p className="text-xs text-gray-600">Shop ID: {getShopId(refundData)}</p>
                  </div>
                </div>
                {/* Shop Address - assuming it's available in shops[0] or from order delivery */}
                <div>
                  <p className="text-xs text-muted-foreground">Shop Address</p>
                  <p className="text-sm">{refundData.order_info?.delivery_address_text || 'Address not available'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/shop/${getShopId(refundData)}`)}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  Visit Shop Again
                </Button>
              </div>
            </div>

            {/* Items Returned */}
            <Card>
              <CardHeader>
                <CardTitle>Items Returned</CardTitle>
                <CardDescription>Items that were successfully refunded</CardDescription>
              </CardHeader>
              <CardContent>
                {!refundData.order_items?.length ? (
                  <div className="text-sm text-muted-foreground">No items found.</div>
                ) : (
                  <div className="space-y-4">
                    {refundData.order_items.map((item: RefundItem) => {
                      const sku = item.product?.skus?.[0];
                      const variantLabel = sku?.option_ids?.map((id: string) => {
                        const variant = item.product?.variants?.find(v => 
                          v.options.some(opt => opt.id === id)
                        );
                        if (variant) {
                          const option = variant.options.find(opt => opt.id === id);
                          return option?.title;
                        }
                        return null;
                      }).filter(Boolean).join(' • ');

                      return (
                        <div key={item.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
                                <img
                                  src={sku?.image || '/crimsonity.png'}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                              <div>
                                <div className="font-medium">{item.product?.name || 'Product'}</div>
                                {variantLabel && (
                                  <div className="mt-1 text-sm text-gray-700">
                                    <div className="text-xs text-muted-foreground">Variant</div>
                                    <div className="font-medium">{variantLabel}</div>
                                    <div className="text-xs text-gray-500">{sku?.sku_code ? `SKU: ${sku.sku_code}` : null}</div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Qty: {item.quantity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Refunded</div>
                              <div className="font-medium text-green-600">{formatCurrency(item.total_amount)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Refund Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Refunded:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(refundData.total_refund_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Method:</span>
                <span className="capitalize">
                  {refundData.final_refund_method || refundData.preferred_refund_method}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed:</span>
                <span>{formatDate(refundData.completed_at || '')}</span>
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

        <Card className="border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${getShopId(refundData)}`)}
            >
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/orders/${getOrderNumber(refundData)}`)}
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View Order
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/faq/refunds`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Refund FAQ
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-green-100 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Refund Completed</p>
                <p className="text-xs text-green-700 mt-1">
                  Your refund has been processed successfully. Thank you for shopping with us!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NegotiationStatusUI({ refundData, formatDate, formatCurrency, navigate, onRespond, actionLoading }: any) {
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
                Refund Request #{refundData.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Order #{getOrderNumber(refundData)} • Under negotiation
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

            {/* Seller's Offer */}
            {refundData.seller_suggested_method && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Seller's Offer</p>
                        <p className="text-xs text-blue-700">From {getShopName(refundData)}</p>
                      </div>
                      {refundData.negotiation_deadline && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {formatDate(refundData.negotiation_deadline)}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Offer Details */}
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Suggested Method:</p>
                          <p className="font-medium">{refundData.seller_suggested_method}</p>
                        </div>
                        {refundData.seller_suggested_amount && (
                          <div>
                            <p className="text-xs text-muted-foreground">Suggested Amount:</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(refundData.seller_suggested_amount)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {refundData.seller_suggested_reason && (
                        <div>
                          <p className="text-xs text-muted-foreground">Seller's Reason:</p>
                          <p className="text-sm text-gray-700">{refundData.seller_suggested_reason}</p>
                        </div>
                      )}
                      
                      {refundData.seller_response && (
                        <div>
                          <p className="text-xs text-muted-foreground">Additional Message:</p>
                          <p className="text-sm text-gray-700">{refundData.seller_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Your Original Request */}
            <div className="border rounded p-3">
              <p className="text-sm font-medium mb-2">Your Original Request</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Requested Amount:</p>
                  <p className="text-sm font-medium">{formatCurrency(refundData.total_refund_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested Method:</p>
                  <p className="text-sm font-medium">{refundData.preferred_refund_method || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Reason:</p>
                  <p className="text-sm">{refundData.reason}</p>
                </div>
              </div>
            </div>

            {/* Negotiation Deadline Warning */}
            {refundData.is_negotiation_expired && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Negotiation Deadline Passed</AlertTitle>
                <AlertDescription className="text-red-700">
                  The negotiation deadline has passed. You can still respond or file a dispute.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        {/* Offer Comparison */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Offer Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Request:</span>
              <span>{formatCurrency(refundData.total_refund_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seller's Offer:</span>
              <span className="text-green-600">
                {refundData.seller_suggested_amount 
                  ? formatCurrency(refundData.seller_suggested_amount)
                  : 'No amount specified'}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Difference:</span>
              <span className={
                (refundData.seller_suggested_amount && refundData.seller_suggested_amount < refundData.total_refund_amount)
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }>
                {refundData.seller_suggested_amount 
                  ? formatCurrency(refundData.seller_suggested_amount - refundData.total_refund_amount)
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Response Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(refundData.available_actions?.includes('accept_offer') ?? true) && (
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs"
                onClick={() => onRespond(refundData.refund, 'accept', 'Accepted seller offer')}
                disabled={actionLoading}
              >
                <CheckCircle className="h-3 w-3 mr-1.5" />
                Accept Seller's Offer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/negotiation/counter/${refundData.refund}`)}
            >
              <MessageSquareReply className="h-3 w-3 mr-1.5" />
              Make Counter Offer
            </Button>
            {(refundData.available_actions?.includes('reject_offer') ?? true) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onRespond(refundData.refund, 'reject', 'Rejected seller offer')}
                disabled={actionLoading}
              >
                <XCircle className="h-3 w-3 mr-1.5" />
                Reject Offer
              </Button>
            )}
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/file-dispute/${refundData.refund}`)}
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              File Dispute
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${getShopId(refundData)}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
          </CardContent>
        </Card>

        {/* Deadline Info */}
        {refundData.negotiation_deadline && (
          <Card className="border border-blue-100 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Response Deadline</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Please respond by: {formatDate(refundData.negotiation_deadline)}
                  </p>
                  {refundData.is_negotiation_expired && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Deadline has passed
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ApprovedStatusUI({ refundData, formatDate, formatCurrency, navigate, user }: any) {
  const statusConfig = refundData.status === 'to_process' ? STATUS_CONFIG.to_process : STATUS_CONFIG.approved;
  const [showReturnDetails, setShowReturnDetails] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(refundData.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Refund Request #{refundData.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription>
              Order #{getOrderNumber(refundData)} • {refundData.status === 'to_process' ? 'Processing started' : 'Approved'} on {formatDate(refundData.approved_at || refundData.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className={refundData.status === 'to_process' ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}>
              {refundData.status === 'to_process' ? (
                <Package className="h-4 w-4 text-blue-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertTitle className={refundData.status === 'to_process' ? "text-blue-800" : "text-green-800"}>
                {refundData.status === 'to_process' ? 'Return Processing Started!' : 'Refund Request Approved!'}
              </AlertTitle>
              <AlertDescription className={refundData.status === 'to_process' ? "text-blue-700" : "text-green-700"}>
                {refundData.status === 'to_process' 
                  ? 'Your return is being processed. Please complete the return steps below.'
                  : refundData.refund_category === 'keep_item'
                  ? 'Your partial refund request has been approved. The refund will be processed to your selected method.'
                  : 'Your refund request has been approved. Please prepare the item for return within 7 days.'
                }
              </AlertDescription>
            </Alert>

            {/* Refund Items */}
            <div>
              <p className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {refundData.refund_category === 'keep_item' ? 'Items for Partial Refund' : 'Items to Return'} ({refundData.order_items?.length || 0})
              </p>
              <div className="space-y-3">
                {refundData.order_items?.map((item: RefundItem) => {
                  // Get variant label from SKUs
                  const sku = item.product?.skus?.[0];
                  const variantLabel = sku?.option_ids?.map((id: string) => {
                    const variant = item.product?.variants?.find(v => 
                      v.options.some(opt => opt.id === id)
                    );
                    if (variant) {
                      const option = variant.options.find(opt => opt.id === id);
                      return option?.title;
                    }
                    return null;
                  }).filter(Boolean).join(' • ');

                  return (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0">
                          <img
                            src={sku?.image || '/crimsonity.png'}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          {variantLabel && (
                            <div className="mt-2 text-sm text-gray-700">
                              <div>
                                <div className="text-xs text-muted-foreground">Variant</div>
                                <div className="font-medium">{variantLabel}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {sku?.sku_code ? `SKU: ${sku.sku_code}` : null}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="font-medium text-sm">
                          {formatCurrency(item.product.price)}
                        </div>
                      </div>

                      {/* Shop Info */}
                      {item.product.shop && (
                        <div className="pl-15 space-y-2 border-t pt-2">
                          <div className="text-xs">
                            <p className="text-muted-foreground">Shop:</p>
                            <p className="font-medium">{item.product.shop.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Instructions and Waybill - Show only after Process Return is clicked */}
            {showReturnDetails && refundData.refund_category !== 'keep_item' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Return Instructions
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Return Method:</p>
                      <p className="text-sm">Customer Self Arrange</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Deadline:</p>
                      <p className="text-sm">
                        {refundData.buyer_return_deadline 
                          ? formatDate(refundData.buyer_return_deadline)
                          : 'Within 7 days'}
                      </p>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  {refundData.payment_method_details && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Refund Payment Details:</p>
                      <div className="bg-white border rounded p-3">
                        {refundData.payment_method_details.wallet && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">Wallet</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <p>Provider: {refundData.payment_method_details.wallet.provider}</p>
                              <p>Account: {refundData.payment_method_details.wallet.account_name}</p>
                              <p>Number: {refundData.payment_method_details.wallet.account_number}</p>
                            </div>
                          </div>
                        )}
                        {refundData.payment_method_details.bank && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Bank Transfer</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <p>Bank: {refundData.payment_method_details.bank.bank_name}</p>
                              <p>Account: {refundData.payment_method_details.bank.account_name}</p>
                              <p>Number: {refundData.payment_method_details.bank.account_number}</p>
                            </div>
                          </div>
                        )}
                        {refundData.payment_method_details.remittance && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-orange-600" />
                              <span className="text-sm font-medium">Remittance</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <p>Provider: {refundData.payment_method_details.remittance.provider}</p>
                              <p>Name: {refundData.payment_method_details.remittance.full_name}</p>
                              <p>Contact: {refundData.payment_method_details.remittance.contact_number}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Return Process */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-3">Return Process:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-700">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Prepare Your Package</p>
                        <p className="text-xs text-gray-600">Ensure the item is in its original condition with all accessories and packaging.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-700">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Schedule Return</p>
                        <p className="text-xs text-gray-600">Use the "Schedule Return" button below to arrange pickup or find drop-off locations.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-700">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Track Your Return</p>
                        <p className="text-xs text-gray-600">Monitor the return status and receive updates on processing.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-700">4</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Receive Refund</p>
                        <p className="text-xs text-gray-600">Once verified, your refund will be processed to your selected payment method.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Waybill - Show if exists and status is waiting or to_process */}
                {refundData.waybill && (currentStatus === 'waiting' || currentStatus === 'to_process') && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Return Waybill
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Waybill Number:</p>
                          <p className="text-sm font-mono bg-white px-2 py-1 rounded border">{refundData.waybill.waybill_number}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Status:</p>
                          <Badge variant="outline" className="text-xs">
                            {refundData.waybill.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">From (You):</p>
                          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                            <p><strong>{refundData.waybill.customer_info?.name}</strong></p>
                            <p>{refundData.waybill.customer_info?.address}</p>
                            <p>{refundData.waybill.customer_info?.phone}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">To (Shop):</p>
                          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                            <p><strong>{refundData.waybill.shop_info?.name}</strong></p>
                            <p>{refundData.waybill.shop_info?.address}</p>
                            <p>{refundData.waybill.shop_info?.phone}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Items to Return:</p>
                        <div className="bg-white border rounded p-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1">Item</th>
                                <th className="text-left py-1">Quantity</th>
                                <th className="text-left py-1">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {refundData.waybill.return_items?.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                  <td className="py-1">{item.name}</td>
                                  <td className="py-1">{item.quantity}</td>
                                  <td className="py-1">{item.description}</td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan={3} className="py-2 text-center text-gray-500">No items listed</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(refundData.waybill.created_at)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            // Print waybill functionality
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Return Waybill - ${refundData.waybill.waybill_number}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; margin: 20px; }
                                      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                                      .waybill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                                      .info-section { flex: 1; padding: 10px; }
                                      .info-section h3 { margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                                      .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                      .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                                      .items-table th { background-color: #f5f5f5; }
                                      .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>Return Waybill</h1>
                                      <h2>Waybill #${refundData.waybill.waybill_number}</h2>
                                    </div>
                                    
                                    <div class="waybill-info">
                                      <div class="info-section">
                                        <h3>Sender Information</h3>
                                        <p><strong>Customer:</strong> ${refundData.waybill.customer_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${refundData.waybill.customer_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${refundData.waybill.customer_info?.phone || 'N/A'}</p>
                                      </div>
                                      
                                      <div class="info-section">
                                        <h3>Receiver Information</h3>
                                        <p><strong>Shop:</strong> ${refundData.waybill.shop_info?.name || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${refundData.waybill.shop_info?.address || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${refundData.waybill.shop_info?.phone || 'N/A'}</p>
                                      </div>
                                    </div>
                                    
                                    <div class="info-section">
                                      <h3>Return Details</h3>
                                      <p><strong>Order Number:</strong> ${refundData.order_info?.order_number || 'N/A'}</p>
                                      <p><strong>Refund ID:</strong> ${refundData.refund || 'N/A'}</p>
                                      <p><strong>Status:</strong> ${refundData.waybill.status || 'N/A'}</p>
                                      <p><strong>Created:</strong> ${new Date(refundData.waybill.created_at).toLocaleDateString()}</p>
                                    </div>
                                    
                                    <table class="items-table">
                                      <thead>
                                        <tr>
                                          <th>Item</th>
                                          <th>Quantity</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${refundData.waybill.return_items?.map((item: any) => `
                                          <tr>
                                            <td>${item.name || 'N/A'}</td>
                                            <td>${item.quantity || 'N/A'}</td>
                                            <td>${item.description || 'N/A'}</td>
                                          </tr>
                                        `).join('') || '<tr><td colspan="3">No items found</td></tr>'}
                                      </tbody>
                                    </table>
                                    
                                    <div class="footer">
                                      <p>Generated on ${new Date().toLocaleString()}</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print Waybill
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping Information Form */}
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Shipping Information
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Please provide the shipping details for your return package.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const logisticService = formData.get('logistic_service') as string;
                    const trackingNumber = formData.get('tracking_number') as string;

                    if (!logisticService || !trackingNumber) {
                      alert('Please fill in all fields');
                      return;
                    }

                    try {
                      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                      const response = await fetch(`${API_BASE_URL}/return-refund/${refundData.refund}/update_tracking/`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-User-Id': user.id,
                        },
                        body: JSON.stringify({
                          logistic_service: logisticService,
                          tracking_number: trackingNumber,
                        }),
                        credentials: 'include',
                      });

                      if (response.ok) {
                        alert('Shipping information updated successfully');
                        // Optionally refresh or update state
                      } else {
                        console.error('Failed to update tracking');
                        alert('Failed to update shipping information');
                      }
                    } catch (error) {
                      console.error('Error updating tracking:', error);
                      alert('Error updating shipping information');
                    }
                  }}>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Logistic Service *
                        </label>
                        <input
                          type="text"
                          name="logistic_service"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., LBC, J&T Express, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tracking Number *
                        </label>
                        <input
                          type="text"
                          name="tracking_number"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter tracking number"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full h-8 text-xs"
                      >
                        <Package className="h-3 w-3 mr-1.5" />
                        Submit Shipping Info
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
              Refund Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Refund Amount:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(refundData.total_refund_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Preferred Refund Method:</span>
                <span className="capitalize">
                  {refundData.final_refund_method || refundData.preferred_refund_method}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Approved At:</span>
                <span>{formatDate(refundData.approved_at || '')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Deadline:</span>
                <span>
                  {refundData.buyer_return_deadline 
                    ? formatDate(refundData.buyer_return_deadline)
                    : '7 days'}
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
            <CardTitle className="text-sm">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Show alert if seller hasn't notified buyer */}
            {!refundData.buyer_notified_at && refundData.status === 'approved' && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Waiting for Seller Notification</AlertTitle>
                <AlertDescription className="text-amber-700">
                  The seller needs to notify you before you can proceed with the return process.
                </AlertDescription>
              </Alert>
            )}

            {/* Show Process Return button only for return-type refunds */}
            {refundData.refund_category !== 'keep_item' && !showReturnDetails && (
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={async () => {
                  const refundId = refundData?.refund;
                  if (!refundId || typeof refundId !== 'string' || refundId === 'undefined' || refundId.length !== 36) {
                    alert('Invalid refund ID. Please refresh the page and try again.');
                    return;
                  }
                  
                  try {
                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                    const response = await fetch(`${API_BASE_URL}/return-refund/${refundId}/start_return_process/`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-User-Id': user.id,
                      },
                      credentials: 'include',
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setCurrentStatus(data.status);
                      setShowReturnDetails(true);
                    } else {
                      console.error('Failed to start return process');
                    }
                  } catch (error) {
                    console.error('Error starting return process:', error);
                  }
                }}
                disabled={!refundData.buyer_notified_at}
              >
                <Calendar className="h-3 w-3 mr-1.5" />
                Process Return
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${getShopId(refundData)}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => navigate(`/cancel-refund/${refundData.refund}`)}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Cancel Refund
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DisputeStatusUI({ refundData, formatDate, formatCurrency, navigate }: any) {
  const statusConfig = STATUS_CONFIG.dispute;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Refund Request #{refundData.request_number}
              </CardTitle>
              <Badge variant="outline" className={statusConfig.color + " text-xs"}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Order #{getOrderNumber(refundData)} • Dispute filed on {formatDate(refundData.dispute_filed_at || refundData.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dispute Notification */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Dispute Filed</AlertTitle>
              <AlertDescription className="text-orange-700">
                The shop owner has filed a dispute for this refund request. Our team will review the dispute and get back to you within 48 hours.
              </AlertDescription>
            </Alert>

            {/* Refund Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Request Date
                </p>
                <p className="font-medium text-sm">{formatDate(refundData.requested_at)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items
                </p>
                <p className="font-medium text-sm">{refundData.order_items?.length || 0} item(s)</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  Refund Amount
                </p>
                <p className="font-medium text-sm">{formatCurrency(refundData.total_refund_amount)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Dispute Filed
                </p>
                <p className="font-medium text-sm text-orange-600">
                  {formatDate(refundData.dispute_filed_at || refundData.updated_at)}
                </p>
              </div>
            </div>

            {/* Reason for Refund */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-xs font-medium text-gray-800 mb-2">Your Refund Reason</p>
              <p className="text-sm text-gray-700">{refundData.reason}</p>
              {refundData.customer_note && (
                <p className="text-sm text-gray-600 mt-2">{refundData.customer_note}</p>
              )}
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
              <span className="text-muted-foreground">Order Total:</span>
              <span>{formatCurrency(getOrderTotal(refundData))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Amount:</span>
              <span>{formatCurrency(refundData.total_refund_amount)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-sm">
              <span>Status:</span>
              <span className={statusConfig.color.replace('hover:bg-', 'bg-') + " px-2 py-1 rounded text-xs"}>
                {statusConfig.label}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shop Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{getShopName(refundData)}</p>
                <p className="text-xs text-gray-700">Dispute under review</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(`/shop/${getShopId(refundData)}`)}
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View Shop
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/chat/seller/${getShopId(refundData)}`)}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/faq/disputes`)}
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Dispute FAQ
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-orange-100 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Dispute in Progress</p>
                <p className="text-xs text-orange-700 mt-1">
                  Our team is reviewing the dispute filed by the seller. You'll be notified once a decision is made.
                </p>
                <Button
                  variant="link"
                  className="h-6 px-0 text-xs text-orange-700 mt-1"
                  onClick={() => navigate('/support/disputes')}
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

// --- Status UI mapping ---
const STATUS_UI_COMPONENTS = {
  pending: PendingStatusUI,
  negotiation: NegotiationStatusUI,
  approved: ApprovedStatusUI,
  waiting: PendingStatusUI, // Use pending UI for now, update later
  to_verify: PendingStatusUI, // Use pending UI for now, update later
  to_process: ApprovedStatusUI, // Use approved UI since it has product list and return instructions
  dispute: DisputeStatusUI, // Custom UI for dispute status
  completed: CompletedStatusUI,
  rejected: PendingStatusUI, // Use pending UI for now, update later
  cancelled: PendingStatusUI, // Use pending UI for now, update later
};

// --- Main Component ---
export default function ViewReturnRequest({ loaderData }: Route.ComponentProps) {
  const { user, refundData, action } = loaderData;
  const params = useParams<{ returnId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Use the status from the refund data
  const currentStatus = refundData?.status as keyof typeof STATUS_CONFIG || 'pending';

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Local state
  const [refundDataState, setRefundData] = useState(refundData);
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Refresh refund data (optionally by returnId)
  const refreshRefundData = async (id?: string) => {
    const targetId = id || refundDataState?.refund;
    if (!targetId) return;

    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/return-refund/${targetId}/get_my_refund/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-User-Id': user?.id,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setRefundData(data);
        toast({
          title: 'Refund details refreshed',
          variant: 'success',
        });
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch (${res.status})`);
      }
    } catch (err: any) {
      console.error('Error refreshing refund data:', err);
      toast({ title: 'Failed to load refund details', description: String(err.message || err), variant: 'destructive' });
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  async function handleCancel(refundId: string) {
    if (!refundId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/return-refund/${refundId}/cancel_refund/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to cancel request');
      }
      
      const data = await res.json();
      
      // Update local state
      setRefundData((prev: any) => ({
        ...prev,
        status: data.status || 'cancelled',
        cancelled_at: new Date().toISOString(),
      }));
      
      toast({ 
        title: 'Refund cancelled', 
        description: 'Your refund request has been cancelled.',
        variant: 'success' 
      });
      
      // Refresh data to get latest from server
      setTimeout(refreshRefundData, 500);
      
    } catch (err: any) {
      toast({ 
        title: 'Cancel failed', 
        description: err.message || 'Something went wrong',
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function respondToNegotiation(refundId: string, action: 'accept' | 'reject', reason = '') {
    if (!refundId) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/return-refund/${refundId}/respond_to_negotiation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id,
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action, reason })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to respond to offer');
      }
      
      const data = await res.json();
      
      // Update local state
      setRefundData((prev: any) => ({
        ...prev,
        status: data.status || prev.status,
        seller_response: data.message || prev.seller_response,
        approved_at: data.approved_at || prev.approved_at,
      }));
      
      toast({ 
        title: 'Response submitted', 
        description: `Offer ${action === 'accept' ? 'accepted' : 'rejected'}`,
        variant: 'success' 
      });
      
      // Refresh data to get latest from server
      setTimeout(refreshRefundData, 500);
      
    } catch (err: any) {
      toast({ 
        title: 'Action failed', 
        description: err.message || 'Something went wrong',
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return '₱0.00';
    return `₱${amount.toLocaleString('en-PH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRequestNumber = () => {
    if (refundDataState?.request_number) {
      navigator.clipboard.writeText(refundDataState.request_number);
      toast({
        title: 'Copied',
        description: 'Request number copied to clipboard',
        variant: 'default',
      });
    }
  };

  // Props passed into each status-specific UI
  const statusProps = {
    refundData: refundDataState,
    formatDate,
    formatCurrency,
    navigate,
    onCancel: handleCancel,
    onRespond: respondToNegotiation,
    actionLoading,
    user,
  };

  const refundId = refundDataState?.refund || params.returnId;
  const statusConfig = STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig?.icon || Clock;
  const StatusSpecificUI = STATUS_UI_COMPONENTS[currentStatus] || PendingStatusUI;

  // Loading / Error state: show a friendly message and permit retry (instead of an indefinite spinner)
  if (!refundDataState) {
    return (
      <UserProvider user={user}>
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/customer-return-cancel')}
              className="text-gray-600 hover:text-gray-900 px-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="font-semibold">Back to Refund Requests</span>
            </Button>
            <Breadcrumbs />
          </div>

          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Alert className="max-w-md">
                <AlertTitle>Unable to load refund details</AlertTitle>
                <AlertDescription>
                  We couldn't fetch the refund details. This can happen if you're offline or if there was a temporary server issue.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-center gap-2">
                <Button size="sm" onClick={() => refreshRefundData(params.returnId)} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Retry</span>
                  ) : (
                    'Retry'
                  )}
                </Button>

                <Button size="sm" variant="ghost" onClick={() => navigate('/customer-return-cancel')}>Back to list</Button>
              </div>

              <p className="text-xs text-muted-foreground mt-3">Tip: If Retry keeps failing, check your network or contact support.</p>
            </div>
          </div>
        </div>
      </UserProvider>
    );
  }

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
            <span className="font-semibold">Back to Refund Requests</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Header with Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Refund Request</h1>
              <p className="text-muted-foreground">
                Request #<strong>{refundDataState.request_number}</strong>
              </p>
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

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshRefundData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

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
                <DropdownMenuItem onClick={() => navigate(`/upload-evidence/${refundId}`)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Evidence
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/chat/seller/${getShopId(refundDataState)}`)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Seller
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status-Specific UI Section */}
        <StatusSpecificUI {...statusProps} />

      </div>
    </UserProvider>
  );
}