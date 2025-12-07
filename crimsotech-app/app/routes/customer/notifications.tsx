import type { Route } from './+types/notifications';
import SidebarLayout from '~/components/layouts/sidebar'
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
import { useState } from 'react';
import { 
  Bell,
  CheckCircle,
  Clock,
  ShoppingCart,
  Package,
  Truck,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Star,
  Settings,
  Eye,
  EyeOff,
  Check,
  X,
  Search,
  Trash2,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Tag,
  Calendar,
  User,
  Store,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Info,
  FileText
} from 'lucide-react';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Notifications",
    },
  ];
}

// Interface for notifications
interface Notification {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  title: string;
  type: 'order' | 'shipping' | 'payment' | 'system' | 'message' | 'review' | 'promotion' | 'warning';
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string; // For linking to order, product, etc.
  metadata?: Record<string, any>;
}

// Loader function for UI demo
export async function loader({ request, context }: Route.LoaderArgs) {
  const notifications: Notification[] = [
    {
      id: "notif-001",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "New Order Received",
      type: "order",
      message: "You have received a new order #ORD-2024-00150 for ₱15,000 from John Customer. The order includes 3 items and needs to be processed within 24 hours.",
      is_read: false,
      created_at: "2024-01-25T10:30:00Z",
      related_id: "ORD-2024-00150",
      metadata: {
        order_id: "ORD-2024-00150",
        amount: 15000,
        items_count: 3,
        customer_name: "John Customer",
        customer_email: "john@example.com",
        customer_phone: "+63 912 345 6789",
        shipping_address: "123 Main St, Manila, Philippines",
        items: [
          { name: "Apple iPhone 13 Pro", quantity: 1, price: 12000 },
          { name: "AirPods Pro", quantity: 1, price: 8000 },
          { name: "USB-C Cable", quantity: 2, price: 500 }
        ],
        payment_method: "Credit Card",
        payment_status: "Paid",
        order_status: "Pending"
      }
    },
    {
      id: "notif-002",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "Order Shipped Successfully",
      type: "shipping",
      message: "Order #ORD-2024-00149 has been shipped via Standard Shipping. The tracking number is TRK-7890123456 and estimated delivery is January 28, 2024.",
      is_read: true,
      created_at: "2024-01-25T09:15:00Z",
      related_id: "ORD-2024-00149",
      metadata: {
        order_id: "ORD-2024-00149",
        tracking_number: "TRK-7890123456",
        shipping_method: "Standard Shipping",
        estimated_delivery: "2024-01-28",
        courier: "J&T Express",
        shipping_address: "456 Oak Ave, Quezon City, Philippines",
        customer_name: "Maria Santos",
        items: [
          { name: "Samsung Galaxy Watch 4", quantity: 1, price: 12000 }
        ],
        shipping_cost: 150,
        insurance: true,
        package_weight: "0.5kg",
        package_dimensions: "15x10x5cm"
      }
    },
    {
      id: "notif-003",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "Payment Received",
      type: "payment",
      message: "Payment of ₱25,000 has been successfully credited to your seller account. The payment reference is PAY-789012 and was made via Credit Card.",
      is_read: false,
      created_at: "2024-01-25T08:45:00Z",
      metadata: {
        amount: 25000,
        payment_method: "Credit Card",
        reference: "PAY-789012",
        transaction_date: "2024-01-25T08:40:00Z",
        order_ids: ["ORD-2024-00147", "ORD-2024-00148"],
        fees: 500,
        net_amount: 24500,
        payment_gateway: "PayMongo",
        settlement_date: "2024-01-26"
      }
    },
    {
      id: "notif-004",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "New Customer Message",
      type: "message",
      message: "Customer John Doe sent a message regarding order #ORD-2024-00148. They are inquiring about the shipping status and delivery timeframe.",
      is_read: false,
      created_at: "2024-01-24T14:20:00Z",
      related_id: "ORD-2024-00148",
      metadata: {
        customer_name: "John Doe",
        customer_email: "john.doe@email.com",
        order_id: "ORD-2024-00148",
        message: "Hello, I would like to inquire about the shipping status of my order #ORD-2024-00148. When can I expect delivery? Also, can you provide the tracking number?",
        sent_at: "2024-01-24T14:15:00Z",
        priority: "Normal",
        previous_messages: 2,
        customer_since: "2023-11-15"
      }
    },
    {
      id: "notif-005",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "Product Review Received",
      type: "review",
      message: "Customer Sarah Johnson left a 5-star review for 'Apple iPhone 13 Pro'. They praised the product quality and fast shipping.",
      is_read: true,
      created_at: "2024-01-24T11:45:00Z",
      related_id: "prod-001",
      metadata: {
        product_name: "Apple iPhone 13 Pro",
        product_id: "prod-001",
        rating: 5,
        reviewer_name: "Sarah Johnson",
        review: "Excellent product! The iPhone arrived in perfect condition and works flawlessly. Shipping was incredibly fast - I received it within 2 days. The packaging was secure and professional. Highly recommend this seller!",
        review_date: "2024-01-24T11:40:00Z",
        helpful_votes: 12,
        verified_purchase: true,
        order_id: "ORD-2024-00145"
      }
    },
    {
      id: "notif-006",
      user: {
        id: "seller-001",
        username: "jane_seller",
        email: "seller@example.com"
      },
      title: "Low Stock Alert",
      type: "warning",
      message: "Product 'Samsung Galaxy Watch 4' is running low on stock. Only 5 units remaining. Minimum recommended stock level is 10 units.",
      is_read: false,
      created_at: "2024-01-24T09:30:00Z",
      related_id: "prod-002",
      metadata: {
        product_name: "Samsung Galaxy Watch 4",
        product_id: "prod-002",
        current_stock: 5,
        minimum_stock: 10,
        reorder_quantity: 20,
        last_restock_date: "2024-01-10",
        average_monthly_sales: 50,
        estimated_stockout_date: "2024-01-29",
        supplier: "Samsung Official",
        supplier_contact: "supplier@samsung.com",
        reorder_time: "3-5 business days"
      }
    }
  ];

  // Calculate stats
  const total_notifications = notifications.length;
  const unread_notifications = notifications.filter(n => !n.is_read).length;

  return {
    user: {
      id: "demo-seller-123",
      name: "Jane Seller",
      email: "seller@example.com",
      isCustomer: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isSeller: false,
      username: "jane_seller",
    },
    notifications,
    stats: {
      total_notifications,
      unread_notifications
    }
  };
}

// Empty state components
const EmptyNotifications = ({ message = "No notifications" }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {message}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        You're all caught up! New notifications will appear here.
      </p>
    </div>
  </div>
);

// Type configuration with colors and icons
const NOTIFICATION_TYPE_CONFIG = {
  order: { label: 'Order', color: '#3b82f6', icon: ShoppingCart, bgColor: '#eff6ff' },
  shipping: { label: 'Shipping', color: '#8b5cf6', icon: Truck, bgColor: '#f5f3ff' },
  payment: { label: 'Payment', color: '#10b981', icon: DollarSign, bgColor: '#ecfdf5' },
  system: { label: 'System', color: '#6b7280', icon: Settings, bgColor: '#f9fafb' },
  message: { label: 'Message', color: '#f59e0b', icon: MessageSquare, bgColor: '#fffbeb' },
  review: { label: 'Review', color: '#ec4899', icon: Star, bgColor: '#fdf2f8' },
  promotion: { label: 'Promotion', color: '#8b5cf6', icon: Bell, bgColor: '#f5f3ff' },
  warning: { label: 'Alert', color: '#ef4444', icon: AlertCircle, bgColor: '#fef2f2' }
};

export default function SellerNotifications({ loaderData }: Route.ComponentProps) {
  const { user, notifications, stats } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter notifications based on search
  const getFilteredNotifications = () => {
    if (!searchTerm) return notifications;
    
    return notifications.filter(notification => {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title?.toLowerCase().includes(searchLower) ||
        notification.message?.toLowerCase().includes(searchLower) ||
        notification.type?.toLowerCase().includes(searchLower) ||
        notification.metadata?.order_id?.toLowerCase().includes(searchLower) ||
        notification.metadata?.customer_name?.toLowerCase().includes(searchLower)
      );
    });
  };

  const filteredNotifications = getFilteredNotifications();

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return 'Invalid date';
    }
  };

  const formatFullDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getNotificationTypeConfig = (type: string) => {
    return NOTIFICATION_TYPE_CONFIG[type as keyof typeof NOTIFICATION_TYPE_CONFIG] || 
           { label: type, color: '#6b7280', icon: Bell, bgColor: '#f9fafb' };
  };

  const markAsRead = (notificationId: string) => {
    alert(`Marking notification ${notificationId} as read`);
    // In real app: call API to mark as read
  };

  const markAllAsRead = () => {
    alert('Marking all notifications as read');
    // In real app: call API to mark all as read
  };

  const deleteNotification = (notificationId: string) => {
    alert(`Deleting notification ${notificationId}`);
    // In real app: call API to delete notification
  };

  const viewNotificationDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetails(true);
    
    // Mark as read when viewing details
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedNotification(null);
  };

  const getActionButton = (notification: Notification) => {
    switch (notification.type) {
      case 'order':
        return { label: 'View Order', action: () => alert(`Viewing order: ${notification.metadata?.order_id}`) };
      case 'shipping':
        return { label: 'Track Shipment', action: () => alert(`Tracking: ${notification.metadata?.tracking_number}`) };
      case 'payment':
        return { label: 'View Payment', action: () => alert('Viewing payment details') };
      case 'message':
        return { label: 'Reply', action: () => alert('Opening chat') };
      case 'review':
        return { label: 'View Review', action: () => alert('Viewing review') };
      case 'warning':
        return { label: 'Manage Stock', action: () => alert('Managing stock') };
      default:
        return { label: 'View Details', action: () => viewNotificationDetails(notification) };
    }
  };

  return (
    <UserProvider user={user}>
      <SidebarLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
              <p className="text-gray-600 mt-1">All your shop notifications in one place</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Bell className="w-3 h-3 mr-1" />
                {stats.unread_notifications} unread
              </Badge>
              <Button 
                variant="outline"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark All Read
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {/* <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card> */}

          {/* Notifications List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">All Notifications</CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {searchTerm && ` matching "${searchTerm}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length === 0 ? (
                <EmptyNotifications 
                  message={searchTerm ? "No notifications found" : "No notifications"}
                />
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const typeConfig = getNotificationTypeConfig(notification.type);
                    const Icon = typeConfig.icon;
                    const action = getActionButton(notification);
                    
                    return (
                      <div 
                        key={notification.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                        onClick={() => viewNotificationDetails(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Notification Icon */}
                          <div 
                            className="p-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: typeConfig.bgColor }}
                          >
                            <Icon className="w-5 h-5" style={{ color: typeConfig.color }} />
                          </div>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-semibold ${notification.is_read ? 'text-gray-800' : 'text-blue-800'}`}>
                                    {notification.title}
                                  </h3>
                                  {!notification.is_read && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                      New
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDateTime(notification.created_at)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant="outline"
                                  className="text-xs"
                                  style={{ 
                                    backgroundColor: typeConfig.bgColor,
                                    color: typeConfig.color,
                                    borderColor: `${typeConfig.color}40`
                                  }}
                                >
                                  {typeConfig.label}
                                </Badge>
                                
                                {notification.metadata?.order_id && (
                                  <span className="text-xs text-gray-500">
                                    Order: {notification.metadata.order_id}
                                  </span>
                                )}
                              </div>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.action();
                                }}
                                className="text-xs h-7"
                              >
                                {action.label}
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notification Details Sidebar */}
        {showDetails && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-full"
                        style={{ 
                          backgroundColor: getNotificationTypeConfig(selectedNotification.type).bgColor 
                        }}
                      >
                        {(() => {
                          const Icon = getNotificationTypeConfig(selectedNotification.type).icon;
                          return <Icon className="w-6 h-6" style={{ color: getNotificationTypeConfig(selectedNotification.type).color }} />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedNotification.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline"
                            style={{ 
                              backgroundColor: getNotificationTypeConfig(selectedNotification.type).bgColor,
                              color: getNotificationTypeConfig(selectedNotification.type).color,
                              borderColor: `${getNotificationTypeConfig(selectedNotification.type).color}40`
                            }}
                          >
                            {getNotificationTypeConfig(selectedNotification.type).label}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatFullDateTime(selectedNotification.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeDetails}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Main Message */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Message
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{selectedNotification.message}</p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {selectedNotification.metadata && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Details
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Order Details */}
                        {selectedNotification.type === 'order' && selectedNotification.metadata && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Order Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Order ID:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.order_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Amount:</span>
                                      <span className="text-sm font-medium">₱{selectedNotification.metadata.amount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Status:</span>
                                      <Badge className="bg-yellow-100 text-yellow-800">{selectedNotification.metadata.order_status}</Badge>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Payment Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Method:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Status:</span>
                                      <Badge className="bg-green-100 text-green-800">{selectedNotification.metadata.payment_status}</Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Customer Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm">{selectedNotification.metadata.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm">{selectedNotification.metadata.customer_email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm">{selectedNotification.metadata.customer_phone}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Items */}
                            {selectedNotification.metadata.items && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Order Items ({selectedNotification.metadata.items_count})</h4>
                                <div className="space-y-2">
                                  {selectedNotification.metadata.items.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <span className="text-sm">{item.name} × {item.quantity}</span>
                                      <span className="text-sm font-medium">₱{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Shipping Details */}
                        {selectedNotification.type === 'shipping' && selectedNotification.metadata && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Shipping Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Order ID:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.order_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Tracking:</span>
                                      <span className="text-sm font-medium font-mono">{selectedNotification.metadata.tracking_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Courier:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.courier}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Delivery Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Method:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.shipping_method}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Est. Delivery:</span>
                                      <span className="text-sm font-medium">{selectedNotification.metadata.estimated_delivery}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">Cost:</span>
                                      <span className="text-sm font-medium">₱{selectedNotification.metadata.shipping_cost}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Package Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Package Details</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Weight:</span>
                                    <span className="text-sm font-medium">{selectedNotification.metadata.package_weight}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Dimensions:</span>
                                    <span className="text-sm font-medium">{selectedNotification.metadata.package_dimensions}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Insurance:</span>
                                    <Badge className={selectedNotification.metadata.insurance ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                      {selectedNotification.metadata.insurance ? 'Yes' : 'No'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show generic metadata for other types */}
                        {!['order', 'shipping'].includes(selectedNotification.type) && selectedNotification.metadata && (
                          <div className="space-y-4">
                            {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 p-3 rounded">
                                <div className="text-xs font-medium text-gray-500 mb-1 capitalize">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-gray-900">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t p-6">
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={closeDetails}
                    >
                      Close
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          deleteNotification(selectedNotification.id);
                          closeDetails();
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button
                        onClick={() => {
                          getActionButton(selectedNotification).action();
                          closeDetails();
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {getActionButton(selectedNotification).label}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </UserProvider>
  );
}