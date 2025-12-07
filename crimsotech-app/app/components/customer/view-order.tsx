// app/routes/view.order.tsx
import type { Route } from './+types/view-order';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserProvider } from '~/components/providers/user-role-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Printer,
  Download,
  Share2,
  RefreshCw,
  MoreVertical,
  Store,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  ExternalLink,
  Copy,
  Eye,
  Package2,
  Home,
  Building,
  Navigation,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Progress } from '~/components/ui/progress';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: 'Order Details',
    },
  ];
}

// Mock data types
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
}

interface ShippingInfo {
  method: string;
  tracking_number?: string;
  courier?: string;
  estimated_delivery: string;
  address: {
    street: string;
    city: string;
    province: string;
    zip_code: string;
    country: string;
    contact_person: string;
    contact_phone: string;
  };
}

interface PaymentInfo {
  method: 'cod' | 'gcash' | 'paymaya' | 'credit_card' | 'bank_transfer';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  transaction_id?: string;
  paid_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total_amount: number;
  items: OrderItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
  buyer_note?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

// Loader function
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('id');

  // Mock data - replace with actual API call
  const order: Order = {
    id: orderId || 'ORD-2024-00123',
    order_number: `ORD-${Date.now().toString().slice(-6)}`,
    user_id: 'user-123',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-18T14:20:00Z',
    status: 'shipped',
    subtotal: 4567.89,
    shipping_fee: 150.00,
    tax: 547.55,
    discount: 200.00,
    total_amount: 5065.44,
    buyer_note: 'Please deliver before 5 PM',
    items: [
      {
        id: 'item-001',
        product_id: 'prod-001',
        name: 'Wireless Bluetooth Headphones Premium Edition',
        price: 2499.99,
        quantity: 1,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        subtotal: 2499.99,
        status: 'shipped',
        shop_id: 'shop-001',
        shop_name: 'AudioTech Store',
      },
      {
        id: 'item-002',
        product_id: 'prod-002',
        name: 'Smart Watch Series 5 - Waterproof',
        price: 3450.00,
        quantity: 2,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w-400&h=400&fit=crop',
        subtotal: 6900.00,
        status: 'shipped',
        shop_id: 'shop-002',
        shop_name: 'Gadget World',
      },
    ],
    shipping: {
      method: 'Standard Delivery',
      tracking_number: 'TRK-789456123',
      courier: 'J&T Express',
      estimated_delivery: '2024-01-20',
      address: {
        street: '123 Main Street, Unit 4B',
        city: 'Manila',
        province: 'Metro Manila',
        zip_code: '1000',
        country: 'Philippines',
        contact_person: 'Juan Dela Cruz',
        contact_phone: '+63 912 345 6789',
      },
    },
    payment: {
      method: 'gcash',
      status: 'paid',
      amount: 5065.44,
      transaction_id: 'GC-789456123',
      paid_at: '2024-01-15T10:35:00Z',
    },
  };

  const user: User = {
    id: 'user-123',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@example.com',
    phone: '+63 912 345 6789',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  };

  const currentUser = {
    id: 'current-user-456',
    name: 'Seller Store',
    email: 'seller@store.com',
    isCustomer: false,
    isSeller: true,
    isAdmin: false,
    isRider: false,
    isModerator: false,
    username: 'seller_store',
  };

  return {
    user: currentUser,
    order,
    buyer: user,
  };
}

export default function ViewOrder({ loaderData }: Route.ComponentProps) {
  const { user, order, buyer } = loaderData;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      pending: {
        variant: 'outline',
        label: 'Pending',
        icon: <Clock className="w-3 h-3 mr-1" />,
      },
      processing: {
        variant: 'default',
        label: 'Processing',
        icon: <RefreshCw className="w-3 h-3 mr-1" />,
      },
      shipped: {
        variant: 'default',
        label: 'Shipped',
        icon: <Truck className="w-3 h-3 mr-1" />,
      },
      delivered: {
        variant: 'default',
        label: 'Delivered',
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
      },
      cancelled: {
        variant: 'destructive',
        label: 'Cancelled',
        icon: <XCircle className="w-3 h-3 mr-1" />,
      },
      refunded: {
        variant: 'secondary',
        label: 'Refunded',
        icon: <DollarSign className="w-3 h-3 mr-1" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cod':
        return <Banknote className="w-4 h-4" />;
      case 'gcash':
        return <CreditCard className="w-4 h-4" />;
      case 'paymaya':
        return <CreditCard className="w-4 h-4" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
    alert('Order number copied to clipboard!');
  };

  const handleContactBuyer = () => {
    alert('Opening chat with buyer...');
  };

  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Orders
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
                  <p className="text-sm text-gray-500">Manage and track your order</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  {order.order_number}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyOrderNumber}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Order Number
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Order
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>Order Status</CardTitle>
                        <CardDescription>Track your order progress</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Order Progress</span>
                        <span className="text-gray-500">
                          {order.status === 'pending' && '0%'}
                          {order.status === 'processing' && '25%'}
                          {order.status === 'shipped' && '75%'}
                          {order.status === 'delivered' && '100%'}
                          Complete
                        </span>
                      </div>
                      <Progress
                        value={
                          order.status === 'pending' ? 0 :
                          order.status === 'processing' ? 25 :
                          order.status === 'shipped' ? 75 :
                          order.status === 'delivered' ? 100 : 0
                        }
                        className="h-2"
                      />
                    </div>

                    {/* Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-green-100 rounded-full mt-0.5">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Order Placed</div>
                          <div className="text-sm text-gray-500">{formatDate(order.created_at)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full mt-0.5 ${order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Order Confirmed</div>
                          <div className="text-sm text-gray-500">
                            {order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered' 
                              ? formatDate(order.created_at)
                              : 'Pending confirmation'
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full mt-0.5 ${order.status === 'shipped' || order.status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {order.status === 'shipped' || order.status === 'delivered' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Order Shipped</div>
                          <div className="text-sm text-gray-500">
                            {order.status === 'shipped' || order.status === 'delivered'
                              ? 'Shipped on Jan 18, 2024'
                              : 'Preparing for shipment'
                            }
                          </div>
                          {order.shipping.tracking_number && (
                            <div className="mt-2 flex items-center gap-2">
                              <Truck className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-mono">{order.shipping.tracking_number}</span>
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full mt-0.5 ${order.status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {order.status === 'delivered' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Order Delivered</div>
                          <div className="text-sm text-gray-500">
                            {order.status === 'delivered'
                              ? 'Delivered on Jan 20, 2024'
                              : `Estimated: ${order.shipping.estimated_delivery}`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Order Items
                  </CardTitle>
                  <CardDescription>{order.items.length} items in this order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="w-20 h-20 flex-shrink-0">
                          <img
                            src={item.image_url || '/api/placeholder/80/80'}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{item.name}</h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span>Shop: {item.shop_name}</span>
                                <span>Qty: {item.quantity}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(item.subtotal)}</div>
                              <div className="text-sm text-gray-500">
                                {formatCurrency(item.price)} each
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <Button variant="outline" size="sm">
                              View Product
                            </Button>
                            <Button variant="outline" size="sm">
                              Contact Shop
                            </Button>
                            {item.status === 'delivered' && (
                              <Button variant="outline" size="sm">
                                Return/Refund
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-500">Shipping Method</div>
                        <div className="font-medium">{order.shipping.method}</div>
                        {order.shipping.courier && (
                          <div className="text-sm text-gray-600">Courier: {order.shipping.courier}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-500">Tracking Number</div>
                        <div className="font-mono font-medium">{order.shipping.tracking_number || 'Not available yet'}</div>
                        {order.shipping.tracking_number && (
                          <Button variant="outline" size="sm" className="mt-2">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Track Package
                          </Button>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <h4 className="font-medium">Delivery Address</h4>
                      </div>
                      <div className="pl-7 space-y-1">
                        <div>{order.shipping.address.contact_person}</div>
                        <div>{order.shipping.address.street}</div>
                        <div>{order.shipping.address.city}, {order.shipping.address.province}</div>
                        <div>{order.shipping.address.zip_code}, {order.shipping.address.country}</div>
                        <div className="flex items-center gap-2 mt-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{order.shipping.address.contact_phone}</span>
                        </div>
                      </div>
                    </div>

                    {order.buyer_note && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-400" />
                            <h4 className="font-medium">Buyer's Note</h4>
                          </div>
                          <div className="pl-7 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                            <p className="text-sm text-gray-700">{order.buyer_note}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span>{formatCurrency(order.shipping_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button className="w-full">Print Invoice</Button>
                  <Button variant="outline" className="w-full">
                    Download Receipt
                  </Button>
                </CardFooter>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getPaymentMethodIcon(order.payment.method)}
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Method</span>
                      <Badge variant="outline" className="capitalize">
                        {order.payment.method.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge
                        variant={
                          order.payment.status === 'paid'
                            ? 'default'
                            : order.payment.status === 'pending'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {order.payment.status}
                      </Badge>
                    </div>
                    {order.payment.transaction_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Transaction ID</span>
                        <span className="font-mono text-sm">{order.payment.transaction_id}</span>
                      </div>
                    )}
                    {order.payment.paid_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Paid At</span>
                        <span className="text-sm">{formatDate(order.payment.paid_at)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Buyer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Buyer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                        <img
                          src={buyer.avatar_url || '/api/placeholder/48/48'}
                          alt={buyer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{buyer.name}</div>
                        <div className="text-sm text-gray-500">{buyer.email}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{buyer.email}</span>
                      </div>
                      {buyer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{buyer.phone}</span>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleContactBuyer} className="w-full" variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact Buyer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Order Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.status === 'pending' && (
                      <>
                        <Button className="w-full">Confirm Order</Button>
                        <Button variant="outline" className="w-full text-red-600">
                          Cancel Order
                        </Button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <Button className="w-full">
                        <Truck className="w-4 h-4 mr-2" />
                        Arrange Shipment
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button variant="outline" className="w-full">
                        Update Tracking
                      </Button>
                    )}
                    {order.status === 'delivered' && (
                      <Button variant="outline" className="w-full">
                        Rate Buyer
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full text-gray-600">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="p-1 mt-0.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium">Order Created</div>
                        <div className="text-sm text-gray-500">{formatDate(order.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1 mt-0.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium">Payment Received</div>
                        <div className="text-sm text-gray-500">
                          {order.payment.paid_at ? formatDate(order.payment.paid_at) : 'Pending'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="p-1 mt-0.5">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium">Last Updated</div>
                        <div className="text-sm text-gray-500">{formatDate(order.updated_at)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <div className="font-medium">Order #{order.order_number}</div>
                  <div className="text-sm text-gray-500">{getStatusBadge(order.status)}</div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold ml-2">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Close
                </Button>
                {order.status === 'processing' && (
                  <Button>
                    <Truck className="w-4 h-4 mr-2" />
                    Arrange Shipment
                  </Button>
                )}
                <Button variant="default">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}