"use client";
import React, { useState } from 'react';
import type { Route } from './+types/view-order';
import { useParams, useNavigate, useSearchParams} from 'react-router-dom';
import { UserProvider } from '~/components/providers/user-role-provider';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import Breadcrumbs from "~/components/ui/breadcrumbs";
import {
  ArrowLeft,
  Calendar,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Image as ImageIcon,
  User,
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
  CreditCard as CardIcon,
  Truck as ShippingIcon,
  Package as PackageIcon,
  ShoppingCart,
  Tag,
  DollarSign,
  Hash,
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
      title: "My Order",
    },
  ];
}

// --- Status Configuration ---
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: Clock,
    description: 'Order placed, waiting for seller confirmation',
    customerAction: 'Waiting for seller to confirm your order'
  },
  in_progress: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: Clock,
    description: 'Seller is preparing your order',
    customerAction: 'Seller is processing your order'
  },
  to_ship: {
    label: 'To Ship',
    color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    icon: Package,
    description: 'Order packed and ready for shipping',
    customerAction: 'Order is being prepared for shipping'
  },
  to_receive: {
    label: 'In Transit',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: Truck,
    description: 'Order is on its way to you',
    customerAction: 'Your order is out for delivery'
  },
  completed: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
    description: 'Order successfully delivered',
    customerAction: 'Order delivered successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 hover:bg-red-100',
    icon: XCircle,
    description: 'Order cancelled',
    customerAction: 'Your order has been cancelled'
  },
  return_refund: {
    label: 'Return Requested',
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    icon: RotateCcw,
    description: 'Return or refund in process',
    customerAction: 'Your return request is being processed'
  }
};

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
  status: 'pending' | 'in_progress' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'return_refund';
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

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface OrderDetails {
  order: Order;
  customer: Customer;
}

// --- Loader ---
export async function loader({  params, request }: Route.LoaderArgs) {
  const { orderId } = params as { orderId: string };
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  // Mock data - Updated for buyer perspective
  const orderDetails: OrderDetails = {
    order: {
      id: orderId || "PUR-2024-00123",
      order_number: `ORD-${Date.now().toString().slice(-6)}`,
      user_id: 'user-123',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-18T14:20:00Z',
      status: status as any || 'pending',
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
          status: 'pending',
          shop_id: 'shop-001',
          shop_name: 'AudioTech Store',
          color: 'Black',
          seller_note: 'Includes 1-year warranty'
        },
        {
          id: 'item-002',
          product_id: 'prod-002',
          name: 'Smart Watch Series 5 - Waterproof',
          price: 3450.00,
          quantity: 2,
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w-400&h=400&fit=crop',
          subtotal: 6900.00,
          status: 'pending',
          shop_id: 'shop-002',
          shop_name: 'Gadget World',
          color: 'Gray',
          seller_note: 'Free screen protector included'
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
    orderDetails
  };
}

// --- Status-Specific UI Components for BUYER ---

function PendingStatusUI({ orderDetails, formatDate, formatCurrency }: any) {
  const order = orderDetails.order;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Order Placed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Waiting for Seller Confirmation</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your order has been placed successfully. The seller will confirm your order within 24 hours.
              </AlertDescription>
            </Alert>

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
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
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

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Request Cancellation
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Get Help
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InProgressStatusUI({ orderDetails, formatDate, formatCurrency }: any) {
  const order = orderDetails.order;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Processing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Order Confirmed</AlertTitle>
              <AlertDescription className="text-blue-700">
                The seller has confirmed your order and is now preparing it for shipping.
              </AlertDescription>
            </Alert>

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
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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

            {/* Processing Timeline */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs font-medium text-blue-800 mb-2">Processing Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Order Confirmed</p>
                    <p className="text-xs text-muted-foreground">Seller confirmed your order</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Preparing Items</p>
                    <p className="text-xs text-muted-foreground">Seller is packaging your items</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="h-3 w-3 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ready for Shipping</p>
                    <p className="text-xs text-gray-400">Next step: Shipping arranged</p>
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

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estimated Shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">Within 1-2 business days</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Your order will be prepared and shipped soon. You'll receive tracking information once it's shipped.
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Request Cancellation
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileQuestion className="h-3 w-3 mr-1.5" />
              Shipping FAQ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToShipStatusUI({ orderDetails, formatDate, formatCurrency }: any) {
  const order = orderDetails.order;

  // Mock rider data for this order
  const riderInfo = {
    name: 'Michael Santos',
    contact: '+63 912 345 6789',
    estimatedPickup: 'Today, 2:00 PM - 4:00 PM',
    vehicle: 'Motorcycle'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                <Package className="h-3 w-3 mr-1" />
                Ready to Ship
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-indigo-50 border-indigo-200">
              <Package className="h-4 w-4 text-indigo-600" />
              <AlertTitle className="text-indigo-800">Order Packed and Ready</AlertTitle>
              <AlertDescription className="text-indigo-700">
                Your order has been packed and is waiting for pickup by our delivery rider.
              </AlertDescription>
            </Alert>

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
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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

            {/* Rider Information */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
              <p className="text-xs font-medium text-indigo-800 mb-2">Delivery Information</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{riderInfo.name}</p>
                    <p className="text-xs text-indigo-700">Your Delivery Rider</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact:</p>
                    <p className="font-medium">{riderInfo.contact}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle:</p>
                    <p className="font-medium">{riderInfo.vehicle}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Estimated Pickup:</p>
                    <p className="font-medium">{riderInfo.estimatedPickup}</p>
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

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Order Packed ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-indigo-500" />
                <span className="font-medium">Rider Pickup Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Out for Delivery</span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t">
              <p className="text-muted-foreground">Estimated Delivery:</p>
              <p className="font-medium">{order.shipping.estimated_delivery}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Rider
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Delivery Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToReceiveStatusUI({ orderDetails, formatDate, formatCurrency }: any) {
  const order = orderDetails.order;

  // Mock rider data for in-transit order
  const riderInfo = {
    name: 'Michael Santos',
    contact: '+63 912 345 6789',
    estimatedArrival: 'Today, 3:00 PM - 5:00 PM',
    vehicle: 'Motorcycle',
    currentLocation: '2.5 km away'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <Truck className="h-3 w-3 mr-1" />
                In Transit
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-blue-50 border-blue-200">
              <Truck className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Order On the Way!</AlertTitle>
              <AlertDescription className="text-blue-700">
                Your order is with our delivery rider and on its way to you. Estimated arrival: {riderInfo.estimatedArrival}
              </AlertDescription>
            </Alert>

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
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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

            {/* Rider Tracking Information */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Delivery Rider Information</p>
                  <p className="text-xs text-blue-700">Your order is with the rider</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-white"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Live Tracking
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{riderInfo.name}</p>
                    <p className="text-xs text-blue-700">Delivery Rider</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact:</p>
                    <p className="font-medium">{riderInfo.contact}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle:</p>
                    <p className="font-medium">{riderInfo.vehicle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Location:</p>
                    <p className="font-medium">{riderInfo.currentLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Arrival:</p>
                    <p className="font-medium">{riderInfo.estimatedArrival}</p>
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

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="space-y-1.5">
              <p className="font-medium">Prepare for delivery:</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Have your ID ready</li>
                <li>• Ensure someone is available</li>
                <li>• Check package condition upon arrival</li>
                <li>• Prepare exact amount if COD</li>
              </ul>
            </div>
            {order.buyer_note && (
              <>
                <Separator className="my-2" />
                <div>
                  <p className="font-medium">Your Note to Seller:</p>
                  <p className="text-muted-foreground">{order.buyer_note}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <Phone className="h-3 w-3 mr-1.5" />
              Call Rider
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Message Rider
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompletedStatusUI({ orderDetails, formatDate, formatCurrency, navigate }: any) {
  const order = orderDetails.order;
  const [showDeliveryImage, setShowDeliveryImage] = useState(false);

  // Mock proof of delivery data
  const proofOfDelivery = {
    images: [
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop'
    ],
    receivedBy: 'Juan Dela Cruz',
    deliveryTime: '2024-01-20T14:30:00Z',
    riderName: 'Michael Santos',
    riderContact: '+63 912 345 6789'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Delivered
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Order Delivered Successfully!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your order was delivered on {formatDate(order.updated_at)}. We hope you're enjoying your purchase!
              </AlertDescription>
            </Alert>

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
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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

            {/* Delivery Confirmation */}
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Delivery Confirmed</p>
                  <p className="text-xs text-green-700">Successfully delivered to you</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Delivered On:</p>
                  <p className="font-medium">{formatDate(order.updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received By:</p>
                  <p className="font-medium">{proofOfDelivery.receivedBy}</p>
                </div>
              </div>
            </div>

            {/* Proof of Delivery */}
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Proof of Delivery</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowDeliveryImage(!showDeliveryImage)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showDeliveryImage ? 'Hide Photo' : 'View Photo'}
                </Button>
              </div>
              {showDeliveryImage && (
                <div className="flex justify-center">
                  <div className="border rounded-lg overflow-hidden max-w-xs">
                    <img
                      src={proofOfDelivery.images[0]}
                      alt="Delivery proof"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Delivery Rider:</p>
                  <p className="font-medium">{proofOfDelivery.riderName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rider Contact:</p>
                  <p className="font-medium">{proofOfDelivery.riderContact}</p>
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

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rate Your Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate(`/rate-order/${order.id}`)}
              className="w-full bg-yellow-600 hover:bg-yellow-700 h-9"
              size="sm"
            >
              <Star className="h-4 w-4 mr-2" />
              Rate & Review Order
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Help other buyers by sharing your experience
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/buy-again/${order.id}`)}
            >
              <ShoppingCart className="h-3 w-3 mr-1.5" />
              Buy Again
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/request-refund-return/${order.id}`)}
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Request Return/Refund
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              Download Invoice
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Get Help
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CancelledStatusUI({ orderDetails, formatDate, formatCurrency }: any) {
  const order = orderDetails.order;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order #{order.order_number}
              </CardTitle>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Cancelled
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Order Cancelled</AlertTitle>
              <AlertDescription className="text-red-700">
                This order has been cancelled. If you have any questions, please contact the seller.
              </AlertDescription>
            </Alert>

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
                  <XCircle className="h-3 w-3" />
                  Order Status
                </p>
                <p className="font-medium text-sm text-red-600">Cancelled</p>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <ShoppingCart className="h-3 w-3" />
                Order Items ({order.items.length})
              </p>
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
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

            {/* Cancellation Details */}
            <div className="p-3 bg-gray-50 border rounded">
              <p className="text-sm font-medium mb-2">Cancellation Details</p>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled On:</p>
                    <p className="font-medium">{formatDate(order.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled By:</p>
                    <p className="font-medium">Customer Request</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reason:</p>
                  <p className="font-medium">Changed my mind / No longer needed</p>
                </div>
              </div>
            </div>

            {/* Refund Information */}
            <div className="p-3 border rounded">
              <p className="text-sm font-medium mb-2">Refund Information</p>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount:</p>
                    <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status:</p>
                    <p className={`font-medium ${
                      order.payment.status === 'refunded' ? 'text-green-600' : 
                      order.payment.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {order.payment.status === 'refunded' ? 'Refunded' : 
                       order.payment.status === 'pending' ? 'Processing' : 'Pending'}
                    </p>
                  </div>
                </div>
                {order.payment.status === 'refunded' && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Refund Processed</p>
                        <p className="text-xs text-green-700">
                          Refund of {formatCurrency(order.total_amount)} has been sent to your original payment method.
                          It may take 3-5 business days to appear in your account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="pb-2">
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
              <span>Total Refund:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{order.shipping.address.contact_person}</p>
                <p>{order.shipping.address.street}</p>
                <p>{order.shipping.address.city}, {order.shipping.address.province} {order.shipping.address.zip_code}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.shipping.address.contact_phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium">{order.payment.method.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-medium font-mono">{order.payment.transaction_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid On:</span>
                <span className="font-medium">{order.payment.paid_at ? formatDate(order.payment.paid_at) : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Order Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Contact Seller
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <FileText className="h-3 w-3 mr-1.5" />
              View Cancellation Details
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <ShoppingCart className="h-3 w-3 mr-1.5" />
              Shop Similar Items
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start h-8 text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1.5" />
              Refund Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReturnRefundStatusUI({ refundDetails, formatDate, formatCurrency, handleStatusChange }: any) {
  // Transform refundDetails to match the customer view structure
  const order = {
    order_number: refundDetails.order.order_id,
    created_at: refundDetails.requested_at,
    items: [{
      id: 'item-1',
      name: 'Product from order', // You might need to fetch actual items
      quantity: 1,
      subtotal: refundDetails.refund_amount,
    }],
    shipping: {
      address: {
        contact_person: refundDetails.customer.name,
        street: 'Address from order', // You'll need actual address data
        city: '',
        province: '',
        zip_code: '',
        contact_phone: ''
      }
    },
    payment: {
      method: refundDetails.preferred_refund_method
    }
  };

  const returnRequest = {
    id: refundDetails.refund,
    status: refundDetails.status, // Map seller status to customer status
    reason: refundDetails.reason,
    type: 'refund',
    items: ['item-1'],
    estimatedRefund: refundDetails.refund_amount,
    expectedResponse: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sellerResponseDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    submittedDate: refundDetails.requested_at
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column - Seller View */}
      <div className="lg:col-span-2 space-y-4">
        {/* Copy the structure from customer view but modify for seller */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Return Request #{refundDetails.refund}
              </CardTitle>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Customer Requested Return
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show customer information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Customer
                </p>
                <p className="font-medium text-sm">{refundDetails.customer.name}</p>
                <p className="text-xs text-muted-foreground">{refundDetails.customer.email}</p>
              </div>
              {/* ... rest of seller-specific view ... */}
            </div>
            
            {/* Add seller decision buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleStatusChange('approved')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve Return
              </Button>
              <Button
                onClick={() => handleStatusChange('negotiation')}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject / Negotiate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Right Column */}
      <div className="space-y-4">
        {/* Similar to customer view but with seller context */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {/* Same content structure */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Status UI mapping ---
const STATUS_UI_COMPONENTS = {
  pending: PendingStatusUI,
  in_progress: InProgressStatusUI,
  to_ship: ToShipStatusUI,
  to_receive: ToReceiveStatusUI,
  completed: CompletedStatusUI,
  cancelled: CancelledStatusUI,
  return_refund: ReturnRefundStatusUI,
};

// --- Main Component ---
export default function ViewOrder({ loaderData }: Route.ComponentProps) {
  const { user, orderDetails } = loaderData;
  const params = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get status from URL query param
  const queryStatus = searchParams.get('status');
  
  // Use the status from the query parameter if available, otherwise use loader data's status
  const currentStatus = (queryStatus || orderDetails.order.status) as keyof typeof STATUS_CONFIG;

  // Update order status based on URL
  const order = {
    ...orderDetails.order,
    status: currentStatus,
    id: params.orderId || orderDetails.order.id
  };

  const orderId = order.id;
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
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number);
    alert('Order number copied to clipboard!');
  };

  return (
    <UserProvider user={user}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/purchases')}
            className="text-gray-600 hover:text-gray-900 px-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="font-semibold">Back to My Orders</span>
          </Button>
          <Breadcrumbs />
        </div>

        <Separator />

        {/* Header with Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Order Details</h1>
              <p className="text-muted-foreground">Order #<strong>{order.order_number}</strong></p>
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
                <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Order Details
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
                  Share Order Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status-Specific UI Section */}
        <StatusSpecificUI
          orderDetails={{ ...orderDetails, order }}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          navigate={navigate}
        />
      </div>
    </UserProvider>
  );
}