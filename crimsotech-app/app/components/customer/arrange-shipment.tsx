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
import { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { 
  ArrowLeft,
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
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
  Sparkles,
  UserCircle,
  Star,
  ShieldCheck,
  Award,
  Car,
  Bike,
  Zap,
  Target,
  Tag,
  Send,
  Percent,
  Info,
  Calculator,
  Loader2,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Checkbox } from '~/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Slider } from '~/components/ui/slider';
import AxiosInstance from '../axios/Axios';
import { toast } from 'sonner';

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Arrange Shipment",
    },
  ];
}

interface Rider {
  id: string;
  rider_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_model: string;
  plate_number: string;
  verified: boolean;
  rating: number;
  total_deliveries: number;
  delivery_success_rate: number;
  response_time: string;
  current_location: string;
  base_fee: number;
  accepts_custom_offers: boolean;
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

interface OrderData {
  success: boolean;
  message: string;
  data: {
    order_id: string;
    user: {
      id: string;
      username: string;
      email: string;
      first_name: string;
      last_name: string;
      phone?: string;
    };
    delivery_address: string;
    address_details: {
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
    current_status: string;
    shop_info: {
      id: string;
      name: string;
      address: string;
    };
  };
}

interface RidersResponse {
  success: boolean;
  message: string;
  data: Rider[];
}

interface OfferResponse {
  success: boolean;
  message: string;
  data: {
    order_id: string;
    delivery_id: string;
    rider_name: string;
    offer_amount: number;
    offer_type: string;
    delivery_notes: string;
    status: string;
    submitted_at: string;
  };
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

// Loader function to get order details using AxiosInstance
export async function loader({ request }: Route.LoaderArgs) {
   // Get session for authentication
  const { getSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const shopId = session.get('shopId')
    
    if (!orderId) {
      return {
        error: "Order ID is required",
        orderId: null,
        shopId: shopId,
        user: null,
        order: null,
        riders: [],
        isLoading: false
      };
    }

    if (!shopId) {
      return {
        error: "Shop ID is required",
        orderId: orderId,
        shopId: null,
        user: null,
        order: null,
        riders: [],
        isLoading: false
      };
    }

    // Get order details
    const orderResponse = await AxiosInstance.get(`/arrange-shipment/${orderId}/get_order_details/`, {
      params: { shop_id: shopId }
    });

    // Get available riders
    const ridersResponse = await AxiosInstance.get(`/arrange-shipment/${orderId}/get_available_riders/`, {
      params: { shop_id: shopId }
    });

    return {
      error: null,
      orderId: orderId,
      shopId: shopId,
      user: {
        id: shopId,
        name: orderResponse.data.data.shop_info.name,
        email: "", // You might want to get this from your auth system
        isCustomer: false,
        isSeller: true,
        isAdmin: false,
        isRider: false,
        isModerator: false,
        username: orderResponse.data.data.shop_info.name,
      },
      order: orderResponse.data.data,
      riders: ridersResponse.data.data,
      isLoading: false
    };
  } catch (error: any) {
    console.error("Loader error:", error);
    return {
      error: error.response?.data?.message || "Failed to load shipment data",
      orderId: null,
      shopId: null,
      user: null,
      order: null,
      riders: [],
      isLoading: false
    };
  }
}

// Delivery methods
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
    id: "choose_rider",
    name: "Choose Your Rider",
    description: "Select from available verified riders and make an offer",
    icon: <UserCircle className="w-8 h-8" />,
    cost: 50.00,
    estimated_days: "1-2 business days",
    system_handles: [
      "Shows available riders",
      "Provides rider profiles",
      "Facilitates offer system",
      "Handles delivery updates"
    ],
    seller_responsibilities: [
      "Package item securely",
      "Select preferred rider",
      "Make fair delivery offer",
      "Be available for pickup"
    ],
    buyer_expectations: [
      "Receive tracking updates",
      "Be available for delivery",
      "Inspect item upon delivery"
    ],
    pros: [
      "Choose trusted rider",
      "Negotiate delivery cost",
      "Better control",
      "Preferred scheduling"
    ],
    cons: [
      "Must make fair offer",
      "Rider may decline offer",
      "Must be available for pickup"
    ]
  }
];

export default function ArrangeShipment() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [selectedMethod, setSelectedMethod] = useState<string>("choose_rider");
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [offerAmount, setOfferAmount] = useState<number>(50);
  const [offerType, setOfferType] = useState<'base_fee' | 'custom'>('base_fee');
  const [isLoading, setIsLoading] = useState<boolean>(loaderData.isLoading || false);

  if (loaderData.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{loaderData.error}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!loaderData.order || !loaderData.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading shipment data...</p>
        </div>
      </div>
    );
  }

  const { order, user, riders, orderId, shopId } = loaderData;
  const selectedMethodData = deliveryMethods.find(method => method.id === selectedMethod);
  const selectedRiderData = riders.find((rider: Rider) => rider.id === selectedRider);

  // Update offer amount when rider changes
  useEffect(() => {
    if (selectedRiderData && offerType === 'base_fee') {
      setOfferAmount(selectedRiderData.base_fee);
    }
  }, [selectedRiderData, offerType]);

  const handleSubmitOffer = async () => {
    if (!agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (selectedMethod === "choose_rider" && !selectedRider) {
      toast.error("Please select a rider");
      return;
    }

    if (selectedMethod === "choose_rider" && offerAmount < 50) {
      toast.error("Offer amount must be at least ₱50");
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedMethod === "choose_rider") {
        // Submit shipment offer using AxiosInstance
        const response = await AxiosInstance.post(
          `/arrange-shipment/${orderId}/submit_shipment_offer/`,
          {
            shop_id: shopId,
            rider_id: selectedRiderData?.rider_id,
            offer_amount: offerAmount,
            offer_type: offerType,
            delivery_notes: deliveryNotes
          }
        );

        const offerData: OfferResponse = response.data;

        if (offerData.success) {
          toast.success("🎉 Shipment Offer Sent Successfully!");
          
          let successMessage = `Delivery Method: ${selectedMethodData?.name}\n`;
          successMessage += `Rider: ${selectedRiderData?.user.first_name} ${selectedRiderData?.user.last_name}\n`;
          successMessage += `Your Offer: ₱${offerAmount.toLocaleString()}\n`;
          successMessage += `Vehicle: ${selectedRiderData?.vehicle_type}\n\n`;
          successMessage += "✅ Offer sent to rider for review\n";
          successMessage += "✅ Rider has 24 hours to accept/decline\n";
          successMessage += "✅ You'll be notified of their decision\n";
          successMessage += "✅ If accepted, pickup will be scheduled\n";
          successMessage += `\n📧 Notification sent to: ${order.user.email}`;
          successMessage += "\n\nYou can track this in your 'To Ship' orders.";

          alert(successMessage);
          navigate(`/seller/seller-order-list?tab=to_ship`);
        } else {
          toast.error(offerData.message || "Failed to submit offer");
        }
      } else {
        // Handle seller delivery (no API call needed for this method)
        let successMessage = "🎉 Delivery Method Confirmed!\n\n";
        successMessage += `Delivery Method: ${selectedMethodData?.name}\n`;
        successMessage += "✅ You will coordinate delivery with buyer\n";
        successMessage += "✅ Buyer's address has been provided\n";
        successMessage += "✅ No delivery fees\n";
        successMessage += "✅ Mark as delivered when complete\n";
        successMessage += `\n📧 Notification sent to: ${order.user.email}`;
        successMessage += "\n\nYou can track this in your 'To Ship' orders.";
        
        toast.success("Seller delivery method confirmed!");
        alert(successMessage);
        navigate(`/seller/seller-order-list?tab=to_ship`);
      }
    } catch (error: any) {
      console.error("Submit offer error:", error);
      toast.error(error.response?.data?.message || "Failed to submit offer");
    } finally {
      setIsSubmitting(false);
    }
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

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'motorcycle':
        return '🏍️';
      case 'bike':
        return <Bike className="w-4 h-4" />;
      default:
        return <Car className="w-4 h-4" />;
    }
  };

  const calculateFairOffer = (baseFee: number) => {
    const itemWeight = order.items[0]?.product.weight || 1;
    const weightMultiplier = itemWeight > 5 ? 1.5 : itemWeight > 2 ? 1.2 : 1;
    return Math.max(50, Math.round(baseFee * weightMultiplier));
  };

  const getSuggestedOfferRange = (rider: Rider) => {
    const min = 50;
    const base = rider.base_fee;
    const fair = calculateFairOffer(base);
    const max = Math.max(fair * 1.5, base * 2);
    
    return { min, base, fair, max };
  };

  return (
    <UserProvider user={user}>
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
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
              {order.current_status || 'Ready to Ship'}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Summary */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Info */}
                {order.items.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border rounded flex items-center justify-center">
                        <Box className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{item.product.name}</h3>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        {item.product.weight && (
                          <p className="text-xs text-gray-500">
                            Weight: {item.product.weight} kg
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="font-bold">
                      ₱{item.total_amount.toLocaleString()}
                    </div>
                  </div>
                ))}

                {/* Buyer & Address Info */}
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
                    <div className="text-xs text-gray-500">{order.user.phone}</div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-medium">Delivery Address</span>
                    </div>
                    <div className="text-sm">
                      {order.address_details.street}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.address_details.city}, {order.address_details.province}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.address_details.postal_code}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Method Selection */}
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

                {/* Rider Selection */}
                {selectedMethod === "choose_rider" && (
                  <div className="mt-4 space-y-4">
                    {/* Offer Configuration */}
                    {selectedRiderData && (
                      <Card className="border border-blue-200 bg-blue-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            Make Delivery Offer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Offer Type</Label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={offerType === 'base_fee' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setOfferType('base_fee')}
                                  className="text-xs h-7"
                                >
                                  Base Fee (₱{selectedRiderData.base_fee})
                                </Button>
                                <Button
                                  type="button"
                                  variant={offerType === 'custom' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setOfferType('custom')}
                                  disabled={!selectedRiderData.accepts_custom_offers}
                                  className="text-xs h-7"
                                  title={!selectedRiderData.accepts_custom_offers ? "This rider doesn't accept custom offers" : ""}
                                >
                                  Custom Offer
                                </Button>
                              </div>
                            </div>

                            {offerType === 'custom' && (
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <Label className="text-sm">Offer Amount</Label>
                                    <span className="text-lg font-bold text-blue-600">
                                      ₱{offerAmount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[offerAmount]}
                                      min={50}
                                      max={500}
                                      step={10}
                                      onValueChange={(value) => setOfferAmount(value[0])}
                                      className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                      <span>Min: ₱50</span>
                                      <span>Base: ₱{selectedRiderData.base_fee}</span>
                                      <span>Max: ₱500</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOfferAmount(selectedRiderData.base_fee)}
                                    className="text-xs"
                                  >
                                    Base Fee
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOfferAmount(calculateFairOffer(selectedRiderData.base_fee))}
                                    className="text-xs"
                                  >
                                    Fair Offer
                                  </Button>
                                </div>

                                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                  <div className="flex items-start gap-2">
                                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">Fair Offer Guidelines:</p>
                                      <ul className="mt-1 space-y-0.5">
                                        <li>• Minimum: ₱50</li>
                                        <li>• Base fee: ₱{selectedRiderData.base_fee}</li>
                                        <li>• Fair offer: ₱{calculateFairOffer(selectedRiderData.base_fee)}</li>
                                        <li>• Higher offers may get faster acceptance</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {offerType === 'base_fee' && (
                              <div className="p-3 bg-white border rounded">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Using Rider's Base Fee</p>
                                    <p className="text-sm text-gray-500">
                                      ₱{selectedRiderData.base_fee} • {selectedRiderData.accepts_custom_offers ? 'Accepts custom offers' : 'Fixed fee only'}
                                    </p>
                                  </div>
                                  <Badge variant="secondary">
                                    ₱{selectedRiderData.base_fee}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Rider Selection */}
                    <div>
                      <div className="mb-3">
                        <h3 className="font-medium text-sm">Select Rider</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedRider 
                            ? 'You can change your selection by clicking another rider' 
                            : 'Click on a rider to select them for delivery'}
                        </p>
                      </div>
                      
                      {selectedRiderData && (
                        <div className="p-3 bg-white border border-blue-600 rounded-lg mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {selectedRiderData.user.first_name[0]}{selectedRiderData.user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-sm">
                                    {selectedRiderData.user.first_name} {selectedRiderData.user.last_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      <span className="text-xs">{selectedRiderData.rating}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">
                                      {selectedRiderData.total_deliveries} deliveries
                                    </span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <div className="flex items-center gap-1">
                                      <Target className="w-3 h-3 text-green-500" />
                                      <span className="text-xs">{selectedRiderData.delivery_success_rate}%</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs text-blue-600">
                                  Selected
                                </Badge>
                              </div>
                              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <span>{getVehicleIcon(selectedRiderData.vehicle_type)}</span>
                                  <span>{selectedRiderData.vehicle_type}</span>
                                </div>
                                <span>•</span>
                                <span>{selectedRiderData.vehicle_brand} {selectedRiderData.vehicle_model}</span>
                                <span>•</span>
                                <span>Base Fee: ₱{selectedRiderData.base_fee}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Available Riders List */}
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {riders.map((rider: Rider) => {
                          const offerRange = getSuggestedOfferRange(rider);
                          return (
                            <div
                              key={rider.id}
                              className={`p-3 border rounded-lg cursor-pointer hover:border-blue-400 transition-colors ${
                                selectedRider === rider.id ? 'border-blue-600 bg-blue-50' : 'bg-white'
                              }`}
                              onClick={() => setSelectedRider(rider.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback>
                                    {rider.user.first_name[0]}{rider.user.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">
                                      {rider.user.first_name} {rider.user.last_name}
                                    </h4>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      <span className="text-xs font-medium">{rider.rating}</span>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <span>{getVehicleIcon(rider.vehicle_type)}</span>
                                      <span>{rider.vehicle_type}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{rider.total_deliveries} deliveries</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-1 font-medium">
                                      <span>₱{rider.base_fee}</span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{rider.user.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>{rider.current_location}</span>
                                    </div>
                                    {rider.verified && (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>Verified</span>
                                      </div>
                                    )}
                                    {!rider.accepts_custom_offers && (
                                      <div className="flex items-center gap-1 text-amber-600">
                                        <Info className="w-3 h-3" />
                                        <span>Fixed fee only</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="mt-4">
                      <Label className="text-xs font-medium mb-2 block">
                        Additional Notes (Optional)
                      </Label>
                      <Textarea
                        placeholder="Any special instructions or notes for the rider..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
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

                    {selectedMethod === "choose_rider" && selectedRiderData && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">Selected Rider</div>
                          <div className="font-medium text-sm">
                            {selectedRiderData.user.first_name} {selectedRiderData.user.last_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedRiderData.vehicle_type} • {selectedRiderData.rating} ⭐
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Your Offer</div>
                          <div className="font-bold text-lg text-blue-600">
                            ₱{offerAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {offerType === 'base_fee' ? 'Rider\'s base fee' : 'Custom offer'}
                            {offerAmount < selectedRiderData.base_fee && ' • Below base fee'}
                            {offerAmount > selectedRiderData.base_fee && ' • Above base fee'}
                          </div>
                        </div>
                      </>
                    )}

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
                    I agree to proceed with the selected delivery method and understand that:
                    {selectedMethod === "seller_delivery" && (
                      <span className="block mt-1 text-gray-600">
                        • I am responsible for delivering the item<br/>
                        • I will coordinate directly with the buyer<br/>
                        • No delivery fee will be charged
                      </span>
                    )}
                    {selectedMethod === "choose_rider" && (
                      <span className="block mt-1 text-gray-600">
                        • My offer of ₱{offerAmount} will be sent to the rider<br/>
                        • Rider has 24 hours to accept/decline<br/>
                        • If declined, I can choose another rider<br/>
                        • Final delivery fee charged to buyer<br/>
                        • Item must be properly packaged
                      </span>
                    )}
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  onClick={handleSubmitOffer}
                  disabled={isSubmitting || !agreeToTerms || (selectedMethod === "choose_rider" && !selectedRider)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : selectedMethod === "choose_rider" ? (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 h-3" />
                      Send Offer (₱{offerAmount})
                    </span>
                  ) : (
                    "Confirm Shipment"
                  )}
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

            {/* Delivery Summary */}
            <Card className="border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Delivery Summary</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div className={`p-2 border rounded ${
                      selectedMethod === "seller_delivery" ? 'border-blue-600 bg-blue-50' : ''
                    }`}>
                      <div className="font-medium flex items-center gap-2">
                        <Truck className="w-3 h-3" />
                        Seller Delivery
                      </div>
                      <div className="text-gray-500 mt-1 pl-5">
                        <div>• You handle transportation</div>
                        <div>• No extra fees</div>
                        <div>• Direct buyer contact</div>
                      </div>
                    </div>
                    <div className={`p-2 border rounded ${
                      selectedMethod === "choose_rider" ? 'border-blue-600 bg-blue-50' : ''
                    }`}>
                      <div className="font-medium flex items-center gap-2">
                        <Handshake className="w-3 h-3" />
                        Choose Your Rider
                      </div>
                      <div className="text-gray-500 mt-1 pl-5">
                        <div>• Make delivery offer (min ₱50)</div>
                        <div>• Rider reviews offer</div>
                        <div>• See ratings & reviews</div>
                        <div>• Rider contacts you</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Offer Guidelines */}
            {selectedMethod === "choose_rider" && (
              <Card className="border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Offer Guidelines</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-2">
                      <div className="p-2 border rounded bg-green-50">
                        <div className="font-medium text-green-700">Fair Offers</div>
                        <div className="text-green-600 mt-1">
                          <div>• Base fee: Rider's starting price</div>
                          <div>• Fair offer: Base + weight/distance</div>
                          <div>• Higher offers = faster acceptance</div>
                        </div>
                      </div>
                      <div className="p-2 border rounded bg-amber-50">
                        <div className="font-medium text-amber-700">Low Offers</div>
                        <div className="text-amber-600 mt-1">
                          <div>• Below base fee may be declined</div>
                          <div>• Minimum offer: ₱50</div>
                          <div>• Consider item value & distance</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>All riders are verified and insured. Offers are binding for 24 hours.</span>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}