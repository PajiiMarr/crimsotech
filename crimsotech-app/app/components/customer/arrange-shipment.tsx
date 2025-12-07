// app/routes/arrange-shipment.tsx
import type { Route } from './+types/arrange-shipment';
import { UserProvider } from '~/components/providers/user-role-provider';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { useState } from 'react';
import { useNavigate } from 'react-router';
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
  Store,
  Phone,
  Mail,
  AlertCircle,
  Box,
  Weight,
  Ruler,
  Home,
  Check,
  Handshake,
  ShoppingBag,
  Building,
  PhoneCall,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Checkbox } from '~/components/ui/checkbox';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Arrange Shipment",
    },
  ];
}

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    weight?: number;
    dimensions?: string;
    shop: {
      id: string;
      name: string;
      address: string;
    };
  };
  quantity: number;
  total_amount: number;
}

interface Order {
  order_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  delivery_address: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
    contact_person: string;
    contact_phone: string;
    notes?: string;
  };
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  cost: number;
  estimated_days: string;
  system_handles: string[];
  seller_responsibilities: string[];
  buyer_expectations: string[];
  pros: string[];
  cons: string[];
}

// Loader function to get order details
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');
  const itemId = url.searchParams.get('itemId');

  return {
    user: {
      id: "demo-seller-456",
      name: "TechGadgets Store",
      email: "seller@techgadgets.com",
      isCustomer: false,
      isSeller: true,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      username: "techgadgets_seller",
    },
    orderId: orderId || "ORD-2024-00124",
    itemId: itemId || "item-003",
    order: {
      order_id: orderId || "ORD-2024-00124",
      user: {
        id: "demo-customer-123",
        username: "john_customer",
        email: "customer@example.com",
        first_name: "John",
        last_name: "Customer",
        phone: "+63 912 345 6789"
      },
      delivery_address: {
        street: "123 Main Street",
        city: "Manila",
        province: "Metro Manila",
        postal_code: "1000",
        country: "Philippines",
        contact_person: "John Customer",
        contact_phone: "+63 912 345 6789",
        notes: "Call before delivery"
      },
      items: [
        {
          id: itemId || "item-003",
          product: {
            id: "prod-003",
            name: "MacBook Air M1",
            price: 32000,
            weight: 1.29,
            dimensions: "30.41 x 21.24 x 1.61 cm",
            shop: {
              id: "shop-002",
              name: "TechGadgets Store",
              address: "456 Tech Center, Makati, Metro Manila"
            }
          },
          quantity: 1,
          total_amount: 32000
        }
      ],
      total_amount: 32000,
      payment_method: "GCash",
      created_at: "2024-01-18T14:20:00Z"
    }
  };
}

// Updated: Only TWO delivery methods
const deliveryMethods: DeliveryMethod[] = [
  {
    id: "seller_delivery",
    name: "Seller Delivery",
    description: "You deliver directly to buyer's address",
    icon: <Truck className="w-8 h-8" />,
    cost: 0.00,
    estimated_days: "Flexible (you set timeline)",
    system_handles: [
      "Provides buyer's address",
      "Sends delivery instructions",
      "Notifies buyer",
      "Tracks delivery status"
    ],
    seller_responsibilities: [
      "Arrange own transportation",
      "Schedule delivery with buyer",
      "Travel to buyer's address",
      "Handle item delivery"
    ],
    buyer_expectations: [
      "Be available at address",
      "Provide clear directions",
      "Inspect item upon delivery"
    ],
    pros: [
      "Full control over delivery",
      "No middleman fees",
      "Personal customer service"
    ],
    cons: [
      "Requires time and effort",
      "Transportation costs",
      "Safety considerations"
    ]
  },
  {
    id: "rider_pickup",
    name: "Rider Pickup",
    description: "System assigns rider to handle delivery",
    icon: <Package className="w-8 h-8" />,
    cost: 150.00,
    estimated_days: "1-2 business days",
    system_handles: [
      "Assigns rider automatically",
      "Schedules pickup time",
      "Provides tracking number",
      "Handles delivery updates"
    ],
    seller_responsibilities: [
      "Package item securely",
      "Be available for pickup",
      "Hand over item to rider"
    ],
    buyer_expectations: [
      "Receive tracking updates",
      "Be available for delivery",
      "Inspect item upon delivery"
    ],
    pros: [
      "Hands-off delivery process",
      "Professional handling",
      "Tracking available"
    ],
    cons: [
      "Delivery fee applies",
      "Must be available for pickup"
    ]
  }
];

export default function ArrangeShipment({ loaderData }: Route.ComponentProps) {
  const { user, order, orderId, itemId } = loaderData;
  const navigate = useNavigate();
  
  const [selectedMethod, setSelectedMethod] = useState<string>("seller_delivery");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentItem = order.items.find(item => item.id === itemId);
  const selectedMethodData = deliveryMethods.find(method => method.id === selectedMethod);

  const handleSubmit = async () => {
    if (!agreeToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    setIsSubmitting(true);

    const shipmentData = {
      orderId,
      itemId,
      deliveryMethod: selectedMethod,
      deliveryNotes,
      sellerId: user.id,
      buyerId: order.user.id
    };

    console.log("Submitting shipment arrangement:", shipmentData);

    setTimeout(() => {
      setIsSubmitting(false);
      
      let successMessage = "🎉 Shipment Arrangement Confirmed!\n\n";
      successMessage += `Delivery Method: ${selectedMethodData?.name}\n`;
      successMessage += `Order: #${order.order_id}\n`;
      successMessage += `Buyer: ${order.user.first_name} ${order.user.last_name}\n\n`;
      
      if (selectedMethod === "rider_pickup") {
        successMessage += "✅ Rider will be assigned within 24 hours\n";
        successMessage += "✅ You'll receive pickup schedule\n";
        successMessage += "✅ Tracking number will be provided\n";
        successMessage += "✅ Delivery fee: ₱150.00 (charged to buyer)\n";
      } else if (selectedMethod === "seller_delivery") {
        successMessage += "✅ You will coordinate delivery with buyer\n";
        successMessage += "✅ Buyer's address has been provided\n";
        successMessage += "✅ No delivery fees\n";
        successMessage += "✅ Mark as delivered when complete\n";
      }
      
      successMessage += `\n📧 Notification sent to: ${order.user.email}`;
      successMessage += "\n\nYou can track this in your 'To Ship' orders.";
      
      alert(successMessage);
      navigate(`/orders?tab=to_ship`);
    }, 1500);
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? Any changes will be lost.")) {
      navigate(-1);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <UserProvider user={user}>
      {/* Added max-width container with proper margins */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header - Simplified */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Arrange Shipment</h1>
              <p className="text-gray-600 text-sm mt-1">
                Order #{order.order_id} • {formatDate(order.created_at)}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Ready to Ship
            </Badge>
          </div>
        </div>

        {/* Main Content - Cleaner Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Summary - Compact */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Info */}
                {currentItem && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border rounded flex items-center justify-center">
                        <Box className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{currentItem.product.name}</h3>
                        <p className="text-xs text-gray-500">Qty: {currentItem.quantity}</p>
                      </div>
                    </div>
                    <div className="font-bold">
                      ₱{currentItem.total_amount.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Buyer Info - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-medium">Buyer</span>
                    </div>
                    <div className="text-sm">
                      {order.user.first_name} {order.user.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{order.user.email}</div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-medium">Address</span>
                    </div>
                    <div className="text-sm">
                      {order.delivery_address.street}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.delivery_address.city}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Method Selection - Simplified */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Delivery Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup 
                  value={selectedMethod} 
                  onValueChange={setSelectedMethod}
                  className="space-y-3"
                >
                  {deliveryMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <RadioGroupItem 
                        value={method.id} 
                        id={`method-${method.id}`} 
                        className="sr-only peer"
                      />
                      <Label
                        htmlFor={`method-${method.id}`}
                        className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-blue-400 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50"
                      >
                        <div className="p-2 bg-white border rounded">
                          {method.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{method.name}</div>
                            <div className="font-bold">
                              {method.cost > 0 ? `₱${method.cost}` : 'FREE'}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{method.estimated_days}</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Additional Notes */}
                <div className="mt-4">
                  <Label className="text-xs font-medium mb-2 block">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    placeholder="Any special instructions or notes..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-4">
            {/* Selected Method Details */}
            {selectedMethodData && (
              <Card className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Method Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Selected Method</div>
                      <div className="font-medium">{selectedMethodData.name}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Delivery Fee</div>
                      <div className={`font-bold ${selectedMethodData.cost > 0 ? '' : 'text-green-600'}`}>
                        {selectedMethodData.cost > 0 ? `₱${selectedMethodData.cost}` : 'No Fee'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Timeline</div>
                      <div className="text-sm">{selectedMethodData.estimated_days}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Agreement */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Agreement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-xs leading-tight cursor-pointer">
                    I agree to proceed with the selected delivery method
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !agreeToTerms}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isSubmitting ? "Processing..." : "Confirm Arrangement"}
                </Button>
                
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Cancel
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Comparison */}
            <Card className="border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Quick Comparison</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div className="p-2 border rounded">
                      <div className="font-medium">Seller Delivery</div>
                      <div className="text-gray-500 mt-1">• You handle transportation</div>
                      <div className="text-gray-500">• No extra fees</div>
                      <div className="text-gray-500">• Full control</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="font-medium">Rider Pickup</div>
                      <div className="text-gray-500 mt-1">• System handles delivery</div>
                      <div className="text-gray-500">• ₱150 delivery fee</div>
                      <div className="text-gray-500">• Tracking available</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note - Simplified */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Your delivery choice will be communicated to the buyer</span>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}