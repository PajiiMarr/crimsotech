import type { Route } from './+types/seller-return-refund-cancel';
import SidebarLayout from '~/components/layouts/seller-sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { useState } from 'react';
import { 
  ShoppingCart,
  Clock,
  Package,
  Calendar,
  PhilippinePeso,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  Search,
  Filter,
  Eye,
  Truck,
  Package2,
  CheckSquare,
  List,
  RotateCcw,
  X,
  TruckIcon,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  FileText,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Return/Refund/Cancel",
    },
  ];
}

// Interface for return/refund/cancel items
interface ReturnItem {
  id: string;
  order_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    shop: {
      id: string;
      name: string;
    };
    image?: string;
  };
  quantity: number;
  amount: number;
  type: 'return' | 'refund' | 'cancellation' | 'failed_delivery';
  status: 'pending_review' | 'under_review' | 'returning' | 'refunded' | 'disputed' | 'rejected' | 'cancelled' | 'delivery_failed' | 'pending_cancellation';
  reason: string;
  description?: string;
  created_at: string;
  updated_at: string;
  refund_amount?: number;
  refund_method?: string;
  tracking_number?: string;
  dispute_reason?: string;
  resolution?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  estimated_refund_date?: string;
  actual_refund_date?: string;
  pickup_scheduled_date?: string;
  courier?: string;
  notes?: string;
}

interface ReturnStats {
  total_requests: number;
  return_refund_requests: number;
  cancellation_requests: number;
  failed_delivery_requests: number;
  under_review: number;
  returning: number;
  refunded: number;
  disputed: number;
  rejected_cancelled: number;
}

// Loader function for UI demo
export async function loader({ request, context }: Route.LoaderArgs) {
  const returnItems: ReturnItem[] = [
    {
      id: "RET-2024-001",
      order_id: "ORD-2024-00123",
      product: {
        id: "prod-001",
        name: "Apple iPhone 13 Pro",
        price: 45000,
        shop: {
          id: "shop-001",
          name: "TechGadgets Store"
        }
      },
      quantity: 1,
      amount: 45000,
      type: "return",
      status: "under_review",
      reason: "Product defective",
      description: "Phone screen has dead pixels upon arrival",
      created_at: "2024-01-20T10:30:00Z",
      updated_at: "2024-01-21T14:25:00Z",
      refund_amount: 45000,
      refund_method: "Original Payment Method",
      reviewed_by: "Support Agent 01",
      reviewed_at: "2024-01-21T09:30:00Z",
      estimated_refund_date: "2024-01-28",
      notes: "Awaiting courier pickup"
    },
    {
      id: "RET-2024-002",
      order_id: "ORD-2024-00124",
      product: {
        id: "prod-002",
        name: "Samsung Galaxy Watch 4",
        price: 12000,
        shop: {
          id: "shop-001",
          name: "TechGadgets Store"
        }
      },
      quantity: 1,
      amount: 12000,
      type: "refund",
      status: "returning",
      reason: "Wrong item received",
      description: "Received Galaxy Watch 5 instead of Watch 4",
      created_at: "2024-01-19T14:20:00Z",
      updated_at: "2024-01-22T11:45:00Z",
      refund_amount: 12000,
      refund_method: "Store Credit",
      tracking_number: "TRK-RET-789012",
      pickup_scheduled_date: "2024-01-23",
      courier: "J&T Express",
      notes: "Package in transit to seller"
    },
    {
      id: "RET-2024-003",
      order_id: "ORD-2024-00125",
      product: {
        id: "prod-003",
        name: "MacBook Air M1",
        price: 32000,
        shop: {
          id: "shop-002",
          name: "Apple Premium Reseller"
        }
      },
      quantity: 1,
      amount: 32000,
      type: "return",
      status: "refunded",
      reason: "Changed mind",
      description: "Decided to purchase a different model",
      created_at: "2024-01-15T09:15:00Z",
      updated_at: "2024-01-19T16:30:00Z",
      refund_amount: 32000,
      refund_method: "Bank Transfer",
      actual_refund_date: "2024-01-18",
      notes: "Refund completed successfully"
    },
    {
      id: "RET-2024-004",
      order_id: "ORD-2024-00126",
      product: {
        id: "prod-004",
        name: "Wireless Headphones",
        price: 8500,
        shop: {
          id: "shop-003",
          name: "Audio Express"
        }
      },
      quantity: 1,
      amount: 8500,
      type: "refund",
      status: "disputed",
      reason: "Partial refund requested",
      description: "Headphones working but missing accessories",
      created_at: "2024-01-18T11:30:00Z",
      updated_at: "2024-01-22T10:15:00Z",
      refund_amount: 2000,
      refund_method: "GCash",
      dispute_reason: "Seller disagrees with refund amount",
      resolution: "Under negotiation",
      notes: "Awaiting customer response"
    },
    {
      id: "RET-2024-005",
      order_id: "ORD-2024-00127",
      product: {
        id: "prod-005",
        name: "USB-C Cable",
        price: 500,
        shop: {
          id: "shop-003",
          name: "Audio Express"
        }
      },
      quantity: 2,
      amount: 1000,
      type: "cancellation",
      status: "rejected",
      reason: "Order cancellation",
      description: "Changed mind before shipment",
      created_at: "2024-01-22T08:45:00Z",
      updated_at: "2024-01-23T14:20:00Z",
      refund_amount: 1000,
      refund_method: "Original Payment Method",
      resolution: "Order already shipped, cannot cancel",
      notes: "Can initiate return upon receipt"
    },
    {
      id: "RET-2024-006",
      order_id: "ORD-2024-00128",
      product: {
        id: "prod-006",
        name: "Smartwatch",
        price: 25000,
        shop: {
          id: "shop-004",
          name: "Wearables Hub"
        }
      },
      quantity: 1,
      amount: 25000,
      type: "failed_delivery",
      status: "pending_review",
      reason: "Delivery failed multiple times",
      description: "Courier attempted delivery 3 times, no one available",
      created_at: "2024-01-23T16:30:00Z",
      updated_at: "2024-01-23T16:30:00Z",
      notes: "Awaiting courier review"
    },
    {
      id: "RET-2024-007",
      order_id: "ORD-2024-00129",
      product: {
        id: "prod-007",
        name: "Tablet",
        price: 18000,
        shop: {
          id: "shop-005",
          name: "Electronics World"
        }
      },
      quantity: 1,
      amount: 18000,
      type: "cancellation",
      status: "cancelled",
      reason: "Order cancellation",
      description: "Found better price elsewhere",
      created_at: "2024-01-21T10:00:00Z",
      updated_at: "2024-01-21T15:45:00Z",
      refund_amount: 18000,
      refund_method: "Credit Card",
      actual_refund_date: "2024-01-22",
      notes: "Cancellation approved before shipment"
    },
    {
      id: "RET-2024-008",
      order_id: "ORD-2024-00130",
      product: {
        id: "prod-008",
        name: "Gaming Mouse",
        price: 15000,
        shop: {
          id: "shop-006",
          name: "Gaming Gear"
        }
      },
      quantity: 1,
      amount: 15000,
      type: "return",
      status: "pending_review",
      reason: "Not as described",
      description: "Product color different from photos",
      created_at: "2024-01-24T09:30:00Z",
      updated_at: "2024-01-24T09:30:00Z",
      notes: "New request, under review"
    }
  ];

  // Calculate stats
  const stats: ReturnStats = {
    total_requests: returnItems.length,
    return_refund_requests: returnItems.filter(item => item.type === 'return' || item.type === 'refund').length,
    cancellation_requests: returnItems.filter(item => item.type === 'cancellation').length,
    failed_delivery_requests: returnItems.filter(item => item.type === 'failed_delivery').length,
    under_review: returnItems.filter(item => item.status === 'under_review' || item.status === 'pending_review').length,
    returning: returnItems.filter(item => item.status === 'returning').length,
    refunded: returnItems.filter(item => item.status === 'refunded').length,
    disputed: returnItems.filter(item => item.status === 'disputed').length,
    rejected_cancelled: returnItems.filter(item => item.status === 'rejected' || item.status === 'cancelled').length
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
    returnItems,
    stats
  };
}

// Empty state components
const EmptyTable = ({ message = "No requests found" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <RotateCcw className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Customer return, refund, and cancellation requests will appear here.
      </p>
    </div>
  </div>
);

// Main Tabs configuration
const MAIN_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'return_refund', label: 'Return/Refund', icon: RotateCcw },
  { id: 'cancellation', label: 'Cancellation', icon: X },
  { id: 'failed_delivery', label: 'Failed Delivery', icon: TruckIcon }
];

// Return/Refund subtabs configuration
const RETURN_REFUND_SUBTABS = [
  { id: 'all_return_refund', label: 'All', icon: RotateCcw },
  { id: 'under_review', label: 'Under Review', icon: Clock },
  { id: 'returning', label: 'Returning', icon: Truck },
  { id: 'refunded', label: 'Refunded', icon: CheckCircle },
  { id: 'disputed', label: 'Disputed', icon: ShieldAlert },
  { id: 'rejected_cancelled', label: 'Rejected/Cancelled', icon: XCircle }
];

// Status configuration with colors and icons
const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: '#f59e0b', icon: Clock, bgColor: '#fffbeb' },
  under_review: { label: 'Under Review', color: '#f97316', icon: FileText, bgColor: '#fff7ed' },
  returning: { label: 'Returning', color: '#3b82f6', icon: Truck, bgColor: '#eff6ff' },
  refunded: { label: 'Refunded', color: '#10b981', icon: CheckCircle, bgColor: '#ecfdf5' },
  disputed: { label: 'Disputed', color: '#8b5cf6', icon: ShieldAlert, bgColor: '#f5f3ff' },
  rejected: { label: 'Rejected', color: '#ef4444', icon: XCircle, bgColor: '#fef2f2' },
  cancelled: { label: 'Cancelled', color: '#6b7280', icon: X, bgColor: '#f9fafb' },
  delivery_failed: { label: 'Delivery Failed', color: '#dc2626', icon: AlertTriangle, bgColor: '#fef2f2' },
  pending_cancellation: { label: 'Pending Cancellation', color: '#f59e0b', icon: Clock, bgColor: '#fffbeb' }
};

// Type configuration with colors and icons
const TYPE_CONFIG = {
  return: { label: 'Return', color: '#3b82f6', icon: RotateCcw, bgColor: '#eff6ff' },
  refund: { label: 'Refund', color: '#10b981', icon: PhilippinePeso, bgColor: '#ecfdf5' },
  cancellation: { label: 'Cancellation', color: '#ef4444', icon: X, bgColor: '#fef2f2' },
  failed_delivery: { label: 'Failed Delivery', color: '#dc2626', icon: TruckIcon, bgColor: '#fef2f2' }
};

export default function SellerReturnRefundCancel({ loaderData }: Route.ComponentProps) {
  const { user, returnItems, stats } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [returnRefundSubTab, setReturnRefundSubTab] = useState<string>('all_return_refund');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filter return items based on active tab and subtab
  const getFilteredReturnItems = () => {
    // First filter by search term
    let filtered = returnItems.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.product?.name?.toLowerCase().includes(searchLower) ||
        item.order_id?.toLowerCase().includes(searchLower) ||
        item.product?.shop?.name?.toLowerCase().includes(searchLower) ||
        item.reason?.toLowerCase().includes(searchLower)
      );
    });

    // Then filter by active tab
    if (activeTab !== 'all') {
      if (activeTab === 'return_refund') {
        filtered = filtered.filter(item => 
          item.type === 'return' || item.type === 'refund'
        );

        // Further filter by returnRefundSubTab
        if (returnRefundSubTab === 'under_review') {
          filtered = filtered.filter(item => 
            item.status === 'under_review' || item.status === 'pending_review'
          );
        } else if (returnRefundSubTab === 'returning') {
          filtered = filtered.filter(item => item.status === 'returning');
        } else if (returnRefundSubTab === 'refunded') {
          filtered = filtered.filter(item => item.status === 'refunded');
        } else if (returnRefundSubTab === 'disputed') {
          filtered = filtered.filter(item => item.status === 'disputed');
        } else if (returnRefundSubTab === 'rejected_cancelled') {
          filtered = filtered.filter(item => 
            item.status === 'rejected' || item.status === 'cancelled'
          );
        }
        // 'all_return_refund' shows all items in return_refund tab
      } else if (activeTab === 'cancellation') {
        filtered = filtered.filter(item => item.type === 'cancellation');
      } else if (activeTab === 'failed_delivery') {
        filtered = filtered.filter(item => item.type === 'failed_delivery');
      }
    }

    return filtered;
  };

  const filteredReturnItems = getFilteredReturnItems();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const viewRequestDetails = (requestId: string) => {
    alert(`Viewing detailed information for request ${requestId}`);
    // In real app: navigate(`/seller/returns/${requestId}`);
  };

  const trackReturn = (trackingNumber: string) => {
    alert(`Tracking return shipment: ${trackingNumber}`);
    // In real app: open tracking page
  };

  const contactCustomer = (requestId: string) => {
    alert(`Contacting customer for request ${requestId}`);
    // In real app: open customer chat
  };

  const reviewRequest = (requestId: string) => {
    alert(`Reviewing request ${requestId}`);
    // In real app: open review form
  };

  const processRefund = (requestId: string) => {
    alert(`Processing refund for request ${requestId}`);
    // In real app: open refund processing
  };

  const schedulePickup = (requestId: string) => {
    alert(`Scheduling pickup for request ${requestId}`);
    // In real app: open pickup scheduling
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
           { label: status, color: '#6b7280', icon: AlertCircle, bgColor: '#f9fafb' };
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || 
           { label: type, color: '#6b7280', icon: AlertCircle, bgColor: '#f9fafb' };
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-6">
          {/* Header - Removed "File New Request" button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Return/Refund/Cancel Requests</h1>
              <p className="text-gray-600 mt-1">Manage customer return, refund, and cancellation requests</p>
            </div>
            {/* File New Request button removed for seller side */}
          </div>

          {/* Main Tabs Navigation */}
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = tab.id === 'all' ? stats.total_requests :
                            tab.id === 'return_refund' ? stats.return_refund_requests :
                            tab.id === 'cancellation' ? stats.cancellation_requests :
                            tab.id === 'failed_delivery' ? stats.failed_delivery_requests : 0;

                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'return_refund') {
                        setReturnRefundSubTab('all_return_refund');
                      }
                    }}
                    className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-3 ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent hover:border-gray-300'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Return/Refund Subtabs (only shown when Return/Refund tab is active) */}
          {activeTab === 'return_refund' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Return/Refund Requests</h3>
                <span className="text-sm text-gray-500 ml-2">
                  Manage customer return and refund requests
                </span>
              </div>
              <div className="flex overflow-x-auto">
                {RETURN_REFUND_SUBTABS.map((subtab) => {
                  const Icon = subtab.icon;
                  const isActive = returnRefundSubTab === subtab.id;
                  const count = subtab.id === 'all_return_refund' ? stats.return_refund_requests :
                              subtab.id === 'under_review' ? stats.under_review :
                              subtab.id === 'returning' ? stats.returning :
                              subtab.id === 'refunded' ? stats.refunded :
                              subtab.id === 'disputed' ? stats.disputed :
                              subtab.id === 'rejected_cancelled' ? stats.rejected_cancelled : 0;

                  return (
                    <Button
                      key={subtab.id}
                      variant="ghost"
                      onClick={() => setReturnRefundSubTab(subtab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 ${isActive ? 'bg-white text-blue-600 shadow-sm border border-blue-200' : 'text-gray-600 hover:bg-white/50'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{subtab.label}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold mt-1">{stats.total_requests}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <List className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Return/Refund</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{stats.return_refund_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Product returns & refunds</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancellations</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.cancellation_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order cancellations</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-full">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed Delivery</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{stats.failed_delivery_requests}</p>
                    <p className="text-xs text-muted-foreground mt-1">Delivery issues</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <TruckIcon className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats for Return/Refund Tab */}
          {activeTab === 'return_refund' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Under Review</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{stats.under_review}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Returning</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{stats.returning}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Refunded</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{stats.refunded}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Disputed</p>
                    <p className="text-2xl font-bold mt-1 text-purple-600">{stats.disputed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rejected/Cancelled</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.rejected_cancelled}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {stats.total_requests > 0 
                        ? `${Math.round((stats.refunded / stats.total_requests) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Bar */}
          {/* <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, order ID, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* Requests Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">
                {activeTab === 'all' && 'All Requests'}
                {activeTab === 'return_refund' && (
                  <>
                    {returnRefundSubTab === 'all_return_refund' && 'All Return/Refund Requests'}
                    {returnRefundSubTab === 'under_review' && 'Requests Under Review'}
                    {returnRefundSubTab === 'returning' && 'Returning Items'}
                    {returnRefundSubTab === 'refunded' && 'Refunded Requests'}
                    {returnRefundSubTab === 'disputed' && 'Disputed Requests'}
                    {returnRefundSubTab === 'rejected_cancelled' && 'Rejected/Cancelled Requests'}
                  </>
                )}
                {activeTab === 'cancellation' && 'Cancellation Requests'}
                {activeTab === 'failed_delivery' && 'Failed Delivery Requests'}
              </CardTitle>
              <CardDescription>
                Showing {filteredReturnItems.length} of {returnItems.length} requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReturnItems.length === 0 ? (
                <EmptyTable 
                  message={
                    activeTab === 'return_refund' ? (
                      returnRefundSubTab === 'under_review' ? 'No requests under review' :
                      returnRefundSubTab === 'returning' ? 'No items returning' :
                      returnRefundSubTab === 'refunded' ? 'No refunded requests' :
                      returnRefundSubTab === 'disputed' ? 'No disputed requests' :
                      returnRefundSubTab === 'rejected_cancelled' ? 'No rejected/cancelled requests' :
                      'No return/refund requests'
                    ) :
                    activeTab === 'cancellation' ? 'No cancellation requests' :
                    activeTab === 'failed_delivery' ? 'No failed delivery requests' :
                    'No requests found'
                  }
                />
              ) : (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Request ID</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Product</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Created</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Actions</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredReturnItems.map((item) => {
                          const statusConfig = getStatusConfig(item.status);
                          const typeConfig = getTypeConfig(item.type);
                          const StatusIcon = statusConfig.icon;
                          const TypeIcon = typeConfig.icon;
                          const isExpanded = expandedItem === item.id;

                          return (
                            <>
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm">
                                  <div className="font-medium">{item.id}</div>
                                  <div className="text-xs text-muted-foreground">Order: {item.order_id}</div>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{item.product?.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Qty: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <Badge 
                                    variant="secondary"
                                    className="text-xs capitalize flex items-center gap-1"
                                    style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                                  >
                                    <TypeIcon className="w-3 h-3" />
                                    {typeConfig.label}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  <Badge 
                                    variant="secondary"
                                    className="text-xs capitalize flex items-center gap-1"
                                    style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex items-center gap-1">
                                    <PhilippinePeso className="w-4 h-4 text-muted-foreground" />
                                    {item.amount}
                                    {item.refund_amount && item.refund_amount !== item.amount && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        (Refund: {item.refund_amount})
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    {formatDate(item.created_at)}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="flex flex-col gap-2 min-w-[140px]">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => viewRequestDetails(item.id)}
                                      className="flex items-center justify-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      View Details
                                    </Button>
                                    
                                    {/* Seller-specific actions based on status */}
                                    {(item.status === 'pending_review' || item.status === 'under_review') && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => reviewRequest(item.id)}
                                        className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <FileText className="w-3 h-3" />
                                        Review
                                      </Button>
                                    )}

                                    {item.status === 'under_review' && item.type === 'return' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => schedulePickup(item.id)}
                                        className="flex items-center justify-center gap-1 bg-green-50 text-green-700 hover:bg-green-100"
                                      >
                                        <Truck className="w-3 h-3" />
                                        Schedule Pickup
                                      </Button>
                                    )}

                                    {item.status === 'under_review' && item.type === 'refund' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => processRefund(item.id)}
                                        className="flex items-center justify-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                      >
                                        <PhilippinePeso className="w-3 h-3" />
                                        Process Refund
                                      </Button>
                                    )}

                                    {item.tracking_number && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => trackReturn(item.tracking_number!)}
                                        className="flex items-center justify-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                      >
                                        <Truck className="w-3 h-3" />
                                        Track
                                      </Button>
                                    )}

                                    {(item.status === 'disputed' || item.status === 'under_review') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => contactCustomer(item.id)}
                                        className="flex items-center justify-center gap-1 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        Contact Customer
                                      </Button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpand(item.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan={8} className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Left Column - Request Details */}
                                      <div className="space-y-4">
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Request Details</h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Reason:</span>
                                              <span className="font-medium">{item.reason}</span>
                                            </div>
                                            {item.description && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Description:</span>
                                                <span className="font-medium text-right">{item.description}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Customer:</span>
                                              <span>Customer Name (from order)</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Created:</span>
                                              <span>{formatDateTime(item.created_at)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Last Updated:</span>
                                              <span>{formatDateTime(item.updated_at)}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Refund Details */}
                                        {item.refund_amount && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Refund Details</h4>
                                            <div className="space-y-2 text-sm">
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Refund Amount:</span>
                                                <span className="font-medium flex items-center gap-1">
                                                  <PhilippinePeso className="w-3 h-3" />
                                                  {item.refund_amount}
                                                </span>
                                              </div>
                                              {item.refund_method && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Refund Method:</span>
                                                  <span>{item.refund_method}</span>
                                                </div>
                                              )}
                                              {item.estimated_refund_date && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Est. Refund Date:</span>
                                                  <span>{formatDate(item.estimated_refund_date)}</span>
                                                </div>
                                              )}
                                              {item.actual_refund_date && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Actual Refund Date:</span>
                                                  <span className="text-green-600 font-medium">{formatDate(item.actual_refund_date)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Right Column - Shipping & Status Details */}
                                      <div className="space-y-4">
                                        {/* Shipping Details */}
                                        {(item.tracking_number || item.courier || item.pickup_scheduled_date) && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Shipping Details</h4>
                                            <div className="space-y-2 text-sm">
                                              {item.tracking_number && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Tracking Number:</span>
                                                  <span className="font-medium">{item.tracking_number}</span>
                                                </div>
                                              )}
                                              {item.courier && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Courier:</span>
                                                  <span>{item.courier}</span>
                                                </div>
                                              )}
                                              {item.pickup_scheduled_date && (
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Pickup Scheduled:</span>
                                                  <span>{formatDate(item.pickup_scheduled_date)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Review & Resolution Details */}
                                        <div>
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Status Details</h4>
                                          <div className="space-y-2 text-sm">
                                            {item.reviewed_by && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Reviewed By:</span>
                                                <span>{item.reviewed_by}</span>
                                              </div>
                                            )}
                                            {item.reviewed_at && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Reviewed At:</span>
                                                <span>{formatDateTime(item.reviewed_at)}</span>
                                              </div>
                                            )}
                                            {item.dispute_reason && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Dispute Reason:</span>
                                                <span className="text-red-600">{item.dispute_reason}</span>
                                              </div>
                                            )}
                                            {item.resolution && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Resolution:</span>
                                                <span>{item.resolution}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Notes */}
                                        {item.notes && (
                                          <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Notes</h4>
                                            <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                              {item.notes}
                                            </p>
                                          </div>
                                        )}

                                        {/* Additional Seller Actions */}
                                        <div className="pt-2">
                                          <div className="flex gap-2">
                                            {(item.status === 'pending_review' || item.status === 'under_review') && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="default"
                                                  onClick={() => reviewRequest(item.id)}
                                                  className="flex items-center gap-1"
                                                >
                                                  <CheckCircle className="w-3 h-3" />
                                                  Approve
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => alert(`Rejecting request ${item.id}`)}
                                                  className="flex items-center gap-1"
                                                >
                                                  <XCircle className="w-3 h-3" />
                                                  Reject
                                                </Button>
                                              </>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => contactCustomer(item.id)}
                                              className="flex items-center gap-1"
                                            >
                                              <MessageSquare className="w-3 h-3" />
                                              Contact Customer
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Cards for Seller */}
          {activeTab === 'return_refund' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Seller Guidelines
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-blue-700 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Review within 48 hours</p>
                        <p className="text-blue-600">Respond to customer requests promptly</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Arrange pickup within 3 days</p>
                        <p className="text-blue-600">For approved return requests</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-green-100 p-1 rounded-full mt-0.5">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Process refund within 7 days</p>
                        <p className="text-green-600">Upon receiving returned items</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-purple-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Dispute Resolution
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-purple-700 space-y-3">
                    <p>For disputed requests:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Communicate clearly with customers</li>
                      <li>Request photos/videos as evidence</li>
                      <li>Consider partial refunds for minor issues</li>
                      <li>Escalate to platform support if needed</li>
                    </ul>
                    <div className="pt-2">
                      <Button variant="outline" className="w-full bg-white">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Platform Support
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    Cancellation Policy (Seller)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Seller should approve cancellation if:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Order has not been processed yet</li>
                    <li>Within 1 hour of order placement</li>
                    <li>No shipping label created</li>
                  </ul>
                  <p className="pt-2"><strong>Seller can reject cancellation if:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Order has already been shipped</li>
                    <li>Product has been prepared for shipping</li>
                    <li>More than 1 hour has passed</li>
                  </ul>
                  <p className="pt-2 text-gray-600">Provide clear reasons for rejection and suggest return option.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'failed_delivery' && (
            <Card className="bg-orange-50 border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-5 h-5" />
                    Failed Delivery (Seller)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-orange-700 space-y-2">
                  <p><strong>Seller responsibilities:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Coordinate with courier for redelivery</li>
                    <li>Update customer on delivery status</li>
                    <li>Process refund if delivery is impossible</li>
                    <li>Follow up with courier for updates</li>
                  </ul>
                  <p className="pt-2"><strong>Seller options:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Request courier to reattempt delivery</li>
                    <li>Offer pickup from courier hub</li>
                    <li>Process refund and have item returned</li>
                    <li>Contact customer for alternative address</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}