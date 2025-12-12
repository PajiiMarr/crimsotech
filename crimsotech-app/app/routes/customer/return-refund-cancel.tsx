"use client";

import type { Route } from './+types/return-refund-cancel';
import SidebarLayout from '~/components/layouts/sidebar'
import { UserProvider } from '~/components/providers/user-role-provider';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Card, 
  CardContent 
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Clock,
  Package,
  Calendar,
  PhilippinePeso,
  Eye,
  CheckCircle,
  XCircle,
  Handshake,
  PackageCheck,
  ShieldAlert,
  CheckSquare,
  List,
  RotateCcw,
  User,
  Truck,
  MessageCircle,
  CreditCard,
  FileText,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Return/Refund/Cancel",
    },
  ];
}

interface RefundItem {
  refund: string;
  order: {
    order_id: string;
    total_amount: number;
    created_at: string;
  };
  product_name: string;
  customer_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'waiting_for_return' | 'to_verify' | 'to_process' | 'negotiation' | 'dispute' | 'completed';
  requested_at: string;
  tracking_number?: string;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const refundItems: RefundItem[] = [
    {
      refund: "REF-2024-00123",
      order: {
        order_id: "ORD-2024-00123",
        total_amount: 45000,
        created_at: "2024-01-20T08:30:00Z"
      },
      product_name: "Apple iPhone 13 Pro",
      customer_name: "John Doe",
      reason: "Product defective",
      status: "pending",
      requested_at: "2024-01-20T10:30:00Z"
    },
    {
      refund: "REF-2024-00124",
      order: {
        order_id: "ORD-2024-00124",
        total_amount: 12000,
        created_at: "2024-01-19T12:20:00Z"
      },
      product_name: "Samsung Galaxy Watch 4",
      customer_name: "Jane Smith",
      reason: "Wrong item received",
      status: "approved",
      requested_at: "2024-01-19T14:20:00Z",
      tracking_number: "TRK-RET-789012"
    },
    {
      refund: "REF-2024-00125",
      order: {
        order_id: "ORD-2024-00125",
        total_amount: 32000,
        created_at: "2024-01-15T08:15:00Z"
      },
      product_name: "MacBook Air M1",
      customer_name: "Robert Jones",
      reason: "Changed mind",
      status: "completed",
      requested_at: "2024-01-15T09:15:00Z"
    },
    {
      refund: "REF-2024-00126",
      order: {
        order_id: "ORD-2024-00126",
        total_amount: 8500,
        created_at: "2024-01-18T10:30:00Z"
      },
      product_name: "Wireless Headphones",
      customer_name: "Sarah Wilson",
      reason: "Missing accessories",
      status: "negotiation",
      requested_at: "2024-01-18T11:30:00Z"
    },
    {
      refund: "REF-2024-00127",
      order: {
        order_id: "ORD-2024-00127",
        total_amount: 1000,
        created_at: "2024-01-22T07:45:00Z"
      },
      product_name: "USB-C Cable",
      customer_name: "Mike Brown",
      reason: "Order cancellation",
      status: "rejected",
      requested_at: "2024-01-22T08:45:00Z"
    },
    {
      refund: "REF-2024-00128",
      order: {
        order_id: "ORD-2024-00128",
        total_amount: 25000,
        created_at: "2024-01-23T14:30:00Z"
      },
      product_name: "Smartwatch",
      customer_name: "Lisa Garcia",
      reason: "Delivery failed",
      status: "waiting_for_return",
      requested_at: "2024-01-23T16:30:00Z",
      tracking_number: "TRK-RET-123456"
    },
    {
      refund: "REF-2024-00129",
      order: {
        order_id: "ORD-2024-00129",
        total_amount: 15000,
        created_at: "2024-01-24T09:15:00Z"
      },
      product_name: "Digital Camera",
      customer_name: "Tom Wilson",
      reason: "Item not as described",
      status: "to_verify",
      requested_at: "2024-01-24T11:15:00Z"
    },
    {
      refund: "REF-2024-00130",
      order: {
        order_id: "ORD-2024-00130",
        total_amount: 8000,
        created_at: "2024-01-25T13:45:00Z"
      },
      product_name: "Bluetooth Speaker",
      customer_name: "Emma Clark",
      reason: "Quality issue",
      status: "dispute",
      requested_at: "2024-01-25T15:45:00Z"
    }
  ];

  return {
    user: {
      id: "demo-customer-123",
      name: "John Customer",
      email: "customer@example.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: false,
      username: "john_customer",
    },
    refundItems
  };
}

// Tabs configuration
const STATUS_TABS = [
  { id: 'all', label: 'All', icon: List },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'approved', label: 'Approved', icon: CheckCircle },
  { id: 'negotiation', label: 'Negotiation', icon: Handshake },
  { id: 'rejected', label: 'Rejected', icon: XCircle },
  { id: 'waiting_for_return', label: 'Waiting For Return', icon: Clock },
  { id: 'to_verify', label: 'To Verify', icon: PackageCheck },
  { id: 'to_process', label: 'To Process', icon: CreditCard },
  { id: 'dispute', label: 'Dispute', icon: ShieldAlert },
  { id: 'completed', label: 'Completed', icon: CheckSquare }
];

// Status badges configuration
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  },
  negotiation: { 
    label: 'Negotiation', 
    color: 'bg-purple-100 text-purple-800',
    icon: Handshake
  },
  waiting_for_return: { 
    label: 'Waiting', 
    color: 'bg-blue-100 text-blue-800',
    icon: Clock
  },
  to_verify: { 
    label: 'To Verify', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: PackageCheck
  },
  to_process: { 
    label: 'To Process', 
    color: 'bg-blue-100 text-blue-800',
    icon: CreditCard
  },
  dispute: { 
    label: 'Dispute', 
    color: 'bg-orange-100 text-orange-800',
    icon: ShieldAlert
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800',
    icon: CheckSquare
  }
};

export default function SellerReturnRefundCancel({ loaderData }: Route.ComponentProps) {
  const { user, refundItems } = loaderData;
  const [activeTab, setActiveTab] = useState<string>('all');
  const navigate = useNavigate();
  const [expandedRefunds, setExpandedRefunds] = useState<Set<string>>(new Set());

  // Filter refund items based on active tab
  const getFilteredRefundItems = () => {
    if (activeTab === 'all') {
      return refundItems;
    } else {
      return refundItems.filter(item => item.status === activeTab);
    }
  };

  const filteredRefundItems = getFilteredRefundItems();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge 
        className={`text-[10px] h-5 px-1.5 py-0 flex items-center gap-1 ${config.color}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </Badge>
    );
  };

  const getTabCount = (tabId: string) => {
    if (tabId === 'all') return refundItems.length;
    return refundItems.filter(item => item.status === tabId).length;
  };

  const toggleRefundExpansion = (refundId: string) => {
    const newExpanded = new Set(expandedRefunds);
    if (newExpanded.has(refundId)) {
      newExpanded.delete(refundId);
    } else {
      newExpanded.add(refundId);
    }
    setExpandedRefunds(newExpanded);
  };

  const getActionButtons = (item: RefundItem) => {
    switch(item.status) {
      case 'pending':
        return (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Approve"
              onClick={() => navigate(`/approve-refund/${item.refund}`)}
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Reject"
              onClick={() => navigate(`/reject-refund/${item.refund}`)}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          </>
        );
      case 'approved':
      case 'to_process':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Process Refund"
            onClick={() => navigate(`/process-refund/${item.refund}`)}
          >
            <CreditCard className="w-3 h-3" />
          </Button>
        );
      case 'waiting_for_return':
        return item.tracking_number ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Track Return"
            onClick={() => navigate(`/track-return/${item.tracking_number}`)}
          >
            <Truck className="w-3 h-3" />
          </Button>
        ) : null;
      case 'to_verify':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            title="Verify Item"
            onClick={() => navigate(`/verify-item/${item.refund}`)}
          >
            <CheckCircle className="w-3 h-3" />
          </Button>
        );
      case 'negotiation':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            title="View Negotiation"
            onClick={() => navigate(`/negotiation/${item.refund}`)}
          >
            <Handshake className="w-3 h-3" />
          </Button>
        );
      case 'dispute':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            title="View Dispute"
            onClick={() => navigate(`/dispute/${item.refund}`)}
          >
            <ShieldAlert className="w-3 h-3" />
          </Button>
        );
      case 'completed':
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            title="View Receipt"
            onClick={() => navigate(`/receipt/${item.refund}`)}
          >
            <FileText className="w-3 h-3" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-3 p-3">
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-lg font-bold">Refund Requests</h1>
            <p className="text-gray-500 text-xs">Manage customer refund and return requests</p>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto mb-2">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1 py-0.5 rounded ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Requests List */}
          <div className="space-y-2">
            {filteredRefundItems.length === 0 ? (
              <div className="text-center py-4">
                <RotateCcw className="mx-auto h-6 w-6 text-gray-300 mb-2" />
                <p className="text-gray-500 text-xs">
                  {activeTab === 'all' ? 'No refund requests found' :
                   activeTab === 'pending' ? 'No pending requests' :
                   activeTab === 'approved' ? 'No approved requests' :
                   activeTab === 'negotiation' ? 'No negotiation requests' :
                   activeTab === 'rejected' ? 'No rejected requests' :
                   activeTab === 'waiting_for_return' ? 'No items waiting for return' :
                   activeTab === 'to_verify' ? 'No items to verify' :
                   activeTab === 'to_process' ? 'No requests to process' :
                   activeTab === 'dispute' ? 'No disputes' :
                   'No completed refunds'}
                </p>
              </div>
            ) : (
              filteredRefundItems.map((item) => {
                const isExpanded = expandedRefunds.has(item.refund);
                
                return (
                  <Card key={item.refund} className="overflow-hidden border">
                    <CardContent className="p-3">
                      {/* Top Section - Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{item.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{item.refund}</span>
                            <span>•</span>
                            <span>{formatDate(item.requested_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(item.status)}
                          <button 
                            onClick={() => toggleRefundExpansion(item.refund)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Middle Section - Summary */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <User className="w-3 h-3" />
                          <span className="truncate">{item.customer_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-1 truncate">
                          {item.reason}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            {item.order.order_id}
                          </div>
                          <div className="font-medium text-sm">
                            <PhilippinePeso className="inline w-3 h-3 mr-0.5" />
                            {item.order.total_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Section - Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs space-y-2">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Order Details</div>
                              <div className="text-gray-600 space-y-1">
                                <div>Order ID: {item.order.order_id}</div>
                                <div>Order Date: {formatDate(item.order.created_at)}</div>
                                <div>Request Date: {formatDate(item.requested_at)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Product</div>
                              <div className="text-gray-600">
                                {item.product_name}
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-gray-700 mb-1">Reason</div>
                              <div className="text-gray-600">
                                {item.reason}
                              </div>
                            </div>
                            
                            {item.tracking_number && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">Tracking</div>
                                <div className="text-gray-600">
                                  {item.tracking_number}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Section - Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                         <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/view-refund-request/${item.refund}?status=${item.status}`)}
                              className="h-6 px-2 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </Button>
                        
                        <div className="flex gap-1">
                          {getActionButtons(item)}
                          
                          {/* Contact Customer button for all tabs except completed */}
                          {item.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Contact Customer"
                              onClick={() => navigate(`/chat/customer/${item.customer_name}`)}
                            >
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}