"use client";

import { useState, useEffect } from "react";
import { useLoaderData, Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { 
  ArrowLeft, Package, Truck, Store, CreditCard, Wallet, 
  Globe, Smartphone, User, Tag, ChevronDown, ChevronUp, 
  CheckCircle, XCircle, Crown, Star, Award, TrendingUp,
  Sparkles, Zap, Gift, Percent, DollarSign, BadgeCheck,
  PhilippinePeso, MapPin, Plus, Edit, Home, Building
} from "lucide-react";
import type { Route } from './+types/orders'
import AxiosInstance from "../axios/Axios";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Checkout - Complete Your Order" }];
}

export async function loader({ request, context}: Route.LoaderArgs) {
    const { registrationMiddleware } = await import("~/middleware/registration.server");
    await registrationMiddleware({ request, context, params: {}, unstable_pattern: undefined } as any);
    const { requireRole } = await import("~/middleware/role-require.server");
    const { fetchUserRole } = await import("~/middleware/role.server");
    const { userContext } = await import("~/contexts/user-role");

    let user = (context as any).get(userContext);
    if (!user) {
        user = await fetchUserRole({ request, context });
    }

    await requireRole(request, context, ["isCustomer"]);

    // Get the session to access userId
    const { getSession } = await import('~/sessions.server');
    const session = await getSession(request.headers.get("Cookie"));
    const sessionData = session.data;
    
    console.log('Session data:', sessionData);
    
    // Get selected cart item IDs from URL
    const url = new URL(request.url);
    const selectedIds = url.searchParams.get('selected')?.split(',') || [];
    
    console.log('Checkout Loader - Selected IDs:', selectedIds);
    console.log('Checkout Loader - Session User ID:', sessionData.userId);
    console.log('Checkout Loader - User object:', user);
    
    // Fetch checkout items from backend using AxiosInstance
    let checkoutData = null;
    
    // Try to get userId from multiple sources
    const userId = sessionData.userId || user?.userId || user?.id;
    
    if (selectedIds.length > 0 && userId) {
        try {
            console.log('Fetching checkout items...');
            console.log('Using user ID:', userId);
            
            const response = await AxiosInstance.get('/checkout-order/get_checkout_items/', {
                params: {
                    selected: selectedIds.join(','),
                    user_id: userId
                }
            });
            
            if (response.data) {
                checkoutData = response.data;
                console.log('Checkout data received:', checkoutData);
            } else {
                console.error('No data received from checkout endpoint');
            }
        } catch (error: any) {
            console.error('Error fetching checkout items:', error.response?.data || error.message);
            checkoutData = { 
                success: false, 
                error: error.response?.data?.error || error.message 
            };
        }
    } else {
        console.log('Missing required data:');
        console.log('Selected IDs count:', selectedIds.length);
        console.log('Session userId:', sessionData.userId);
        console.log('User object userId:', user?.userId);
        console.log('User object id:', user?.id);
        console.log('Final userId:', userId);
    }

    return { 
        user: { 
            ...user, 
            userId: userId || user?.userId || user?.id 
        }, 
        checkoutData, 
        selectedIds,
        sessionData 
    };
}

const DELIVERY_METHOD_CHOICES = ['Pickup from Store', 'Standard Delivery'] as const;

// Payment method interface
interface PaymentMethod {
  id: string;
  name: string | ((shippingMethod: string) => string);
  description: string | ((shippingMethod: string) => string);
  icon: React.ComponentType<any>;
  iconColor: string;
  requiresDetails: boolean;
  placeholder?: {
    name: string;
    number: string;
    email: string;
  };
}

const CheckoutPage = () => {
  const loaderData = useLoaderData<typeof loader>();
  const { user, checkoutData } = loaderData;
  
  const [formData, setFormData] = useState({
    agreeTerms: false,
    shippingMethod: "Pickup from Store" as typeof DELIVERY_METHOD_CHOICES[number],
    paymentMethod: "Cash on Pickup",
    ewalletName: "",
    ewalletNumber: "",
    ewalletEmail: "",
    remarks: "",
    selectedAddressId: null as string | null,
  });

  const [loading, setLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    subtotal: 0,
    delivery: 0,
    total: 0,
    discount: 0,
  });
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [showAvailableVouchers, setShowAvailableVouchers] = useState(false);
  const [userPurchaseStats, setUserPurchaseStats] = useState<any>(null);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [activeVoucherCategory, setActiveVoucherCategory] = useState<string>("all");
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  const [defaultShippingAddress, setDefaultShippingAddress] = useState<any>(null);
  const [shopAddresses, setShopAddresses] = useState<any[]>([]);

  const shippingMethods = [
    {
      id: "pickup",
      name: "Pickup from Store" as typeof DELIVERY_METHOD_CHOICES[number],
      description: "Collect your order directly from the seller's shop",
      icon: Store,
      delivery: "Ready in 1-2 hours",
      cost: 0,
    },
    {
      id: "standard",
      name: "Standard Delivery" as typeof DELIVERY_METHOD_CHOICES[number],
      description: "Door-to-door delivery service",
      icon: Truck,
      delivery: "2-4 business days",
      cost: 50.00,
    },
  ];

  const paymentMethods: PaymentMethod[] = [
    {
      id: "cod",
      name: (shippingMethod: string) => shippingMethod === "Pickup from Store" ? "Cash on Pickup" : "Cash on Delivery",
      description: (shippingMethod: string) => shippingMethod === "Pickup from Store" 
        ? "Pay when you pick up your order" 
        : "Pay when you receive your order",
      icon: Wallet,
      iconColor: "text-orange-600",
      requiresDetails: false,
    },
    {
      id: "gcash",
      name: "GCash",
      description: "Pay instantly via GCash",
      icon: Smartphone,
      iconColor: "text-orange-600",
      requiresDetails: true,
      placeholder: {
        name: "GCash Account Name",
        number: "GCash Mobile Number",
        email: "GCash Registered Email",
      }
    },
    {
      id: "paymaya",
      name: "PayMaya",
      description: "Pay using PayMaya wallet",
      icon: CreditCard,
      iconColor: "text-orange-600",
      requiresDetails: true,
      placeholder: {
        name: "PayMaya Account Name",
        number: "PayMaya Mobile Number",
        email: "PayMaya Registered Email",
      }
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Pay securely via PayPal",
      icon: Globe,
      iconColor: "text-orange-600",
      requiresDetails: true,
      placeholder: {
        name: "PayPal Account Name",
        number: "PayPal Phone Number",
        email: "PayPal Email Address",
      }
    },
  ];

  // Helper functions for payment methods
  const getPaymentMethodName = (method: PaymentMethod): string => {
    if (typeof method.name === 'function') {
      return method.name(formData.shippingMethod);
    }
    return method.name;
  };

  const getPaymentMethodDescription = (method: PaymentMethod): string => {
    if (typeof method.description === 'function') {
      return method.description(formData.shippingMethod);
    }
    return method.description;
  };

  useEffect(() => {
    if (checkoutData?.success && checkoutData.checkout_items) {
      const hasOrderedItems = checkoutData.checkout_items.some((item: any) => item.is_ordered === true);
    
      if (hasOrderedItems) {
        setError("Some items in your cart have already been ordered. Please refresh your cart.");
        setProducts([]);
        return;
      }
      
      setProducts(checkoutData.checkout_items.map((item: any) => ({
        id: item.id,
        cartItemId: item.id,
        productId: item.product_id,
        title: item.name,
        price: item.price,
        img: item.image,
        shop: item.shop_name,
        shopId: item.shop_id,
        quantity: item.quantity,
        is_ordered: item.is_ordered,
      })));
      
      if (checkoutData.summary) {
        setSummary({
          subtotal: checkoutData.summary.subtotal,
          delivery: checkoutData.summary.delivery,
          total: checkoutData.summary.total,
          discount: 0,
        });
      }
      
      if (checkoutData.user_purchase_stats) {
        setUserPurchaseStats(checkoutData.user_purchase_stats);
      }
      
      if (checkoutData.available_vouchers) {
        setAvailableVouchers(checkoutData.available_vouchers);
      }
      
      if (checkoutData.shipping_addresses) {
        setShippingAddresses(checkoutData.shipping_addresses);
        if (checkoutData.default_shipping_address) {
          setDefaultShippingAddress(checkoutData.default_shipping_address);
          setFormData(prev => ({ ...prev, selectedAddressId: checkoutData.default_shipping_address.id }));
        } else if (checkoutData.shipping_addresses.length > 0) {
          setDefaultShippingAddress(checkoutData.shipping_addresses[0]);
          setFormData(prev => ({ ...prev, selectedAddressId: checkoutData.shipping_addresses[0].id }));
        }
      }
      
      if (checkoutData.shop_addresses) {
        setShopAddresses(checkoutData.shop_addresses);
      }
    } else if (checkoutData?.error) {
      setError(`Failed to load checkout items: ${checkoutData.error}`);
    }
  }, [checkoutData]);

  useEffect(() => {
    if (summary.subtotal > 0 && user?.userId) {
      fetchVouchersByAmount(summary.subtotal);
    }
  }, [summary.subtotal, user?.userId]);

  const fetchVouchersByAmount = async (amount: number) => {
    setLoadingVouchers(true);
    try {
      const response = await AxiosInstance.get('/checkout-order/get_vouchers_by_amount/', {
        params: {
          user_id: user.userId,
          amount: amount
        }
      });

      if (response.data.success) {
        setAvailableVouchers(response.data.available_vouchers);
        if (response.data.user_stats) {
          setUserPurchaseStats(response.data.user_stats);
        }
      }
    } catch (err: any) {
      console.error('Error fetching vouchers by amount:', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleAddressSelect = (addressId: string) => {
    setFormData(prev => ({ ...prev, selectedAddressId: addressId }));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleShippingMethodChange = (methodName: string) => {
    handleInputChange("shippingMethod", methodName);
    
    // Update payment method if it's Cash on Delivery/Pickup
    if (formData.paymentMethod === "Cash on Delivery" || formData.paymentMethod === "Cash on Pickup") {
      const codMethod = paymentMethods.find(m => m.id === "cod");
      if (codMethod) {
        const newPaymentMethod = getPaymentMethodName(codMethod);
        handleInputChange("paymentMethod", newPaymentMethod);
      }
    }
  };

  const handlePaymentMethodChange = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      const methodName = getPaymentMethodName(method);
      handleInputChange("paymentMethod", methodName);
      
      if (methodId === "cod") {
        setFormData(prev => ({
          ...prev,
          ewalletName: "",
          ewalletNumber: "",
          ewalletEmail: ""
        }));
      }
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code");
      return;
    }

    setVoucherLoading(true);
    setVoucherError(null);

    try {
      const response = await AxiosInstance.post('/checkout-order/validate_voucher/', {
        voucher_code: voucherCode.toUpperCase(),
        user_id: user.userId,
        subtotal: summary.subtotal,
      });

      if (response.data.valid) {
        const voucher = response.data.voucher;
        setAppliedVoucher(voucher);
        setVoucherError(null);
        setVoucherCode("");
        setShowVoucherInput(false);
        
        const newDiscount = voucher.discount_amount;
        const deliveryCost = formData.shippingMethod === "Pickup from Store" ? 0 : 50.00;
        const newTotal = summary.subtotal + deliveryCost - newDiscount;
        
        setSummary(prev => ({
          ...prev,
          discount: newDiscount,
          total: newTotal
        }));
      } else {
        setVoucherError(response.data.error || "Invalid voucher code");
      }
    } catch (err: any) {
      setVoucherError(err.response?.data?.error || "Failed to validate voucher");
      console.error('Voucher validation error:', err);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError(null);
    
    const deliveryCost = formData.shippingMethod === "Pickup from Store" ? 0 : 50.00;
    const newTotal = summary.subtotal + deliveryCost;
    
    setSummary(prev => ({
      ...prev,
      discount: 0,
      total: newTotal
    }));
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    if (!formData.selectedAddressId) {
      setError("Please select a shipping address");
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        user_id: user.userId,
        selected_ids: products.map(p => p.cartItemId),
        shipping_address_id: formData.selectedAddressId,
        payment_method: formData.paymentMethod,
        shipping_method: formData.shippingMethod,
        voucher_id: appliedVoucher?.id || null,
        remarks: formData.remarks.substring(0, 500) || null,
        ...(formData.paymentMethod !== "Cash on Delivery" && formData.paymentMethod !== "Cash on Pickup" && {
          ewallet_details: {
            name: formData.ewalletName,
            number: formData.ewalletNumber,
            email: formData.ewalletEmail,
          }
        })
      };

      const response = await AxiosInstance.post('/checkout-order/create_order/', requestBody);

      if (response.data.success) {
        window.location.href = `/order-successful/${response.data.order_id}`;
      } else {
        throw new Error(response.data.error || 'Failed to create order');
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'An error occurred while placing your order';
      setError(errorMessage);
      console.error('Order placement error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = summary.subtotal;
  const shippingCost = formData.shippingMethod === "Pickup from Store" ? 0 : 50.00;
  const discount = summary.discount;
  const total = subtotal + shippingCost - discount;

  const selectedPaymentMethod = paymentMethods.find(method => 
    getPaymentMethodName(method) === formData.paymentMethod
  );
  const showEwalletFields = selectedPaymentMethod?.requiresDetails;

  const isEwalletFieldsValid = !showEwalletFields || (
    formData.ewalletName.trim() !== "" &&
    (selectedPaymentMethod?.id === "paypal" 
      ? formData.ewalletEmail.trim() !== "" 
      : formData.ewalletNumber.trim() !== "")
  );

  const hasValidProducts = products.length > 0;
  const canPlaceOrder = formData.agreeTerms && isEwalletFieldsValid && hasValidProducts && !loading && formData.selectedAddressId;

  const getTierBadge = (tier: string) => {
    const tierConfig = {
      platinum: { icon: Crown, color: "bg-gradient-to-r from-orange-700 to-amber-900 text-white", label: "Platinum" },
      gold: { icon: Award, color: "bg-gradient-to-r from-amber-500 to-orange-300 text-orange-900", label: "Gold" },
      silver: { icon: Star, color: "bg-gradient-to-r from-gray-300 to-gray-100 text-gray-800", label: "Silver" },
      new: { icon: Sparkles, color: "bg-gradient-to-r from-orange-400 to-amber-200 text-orange-900", label: "New" }
    };
    
    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.new;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getAllVouchers = () => {
    const allVouchers: any[] = [];
    availableVouchers.forEach((category: any) => {
      if (category.vouchers) {
        allVouchers.push(...category.vouchers);
      }
    });
    return allVouchers;
  };

  const getFilteredVouchers = () => {
    if (activeVoucherCategory === "all") {
      return getAllVouchers();
    }
    
    const category = availableVouchers.find((cat: any) => 
      cat.category.includes(activeVoucherCategory.replace("_", " "))
    );
    
    return category ? category.vouchers : [];
  };

  const getSelectedAddress = () => {
    return shippingAddresses.find(addr => addr.id === formData.selectedAddressId);
  };

  const getShopAddressesForProducts = () => {
    if (products.length === 0 || shopAddresses.length === 0) return [];
    
    const productShopIds = [...new Set(products.map(p => p.shopId))];
    return shopAddresses.filter(shop => 
      shop.shop_id && productShopIds.includes(shop.shop_id)
    );
  };

  const getMainShopAddress = () => {
    const shopAddressesForProducts = getShopAddressesForProducts();
    if (shopAddressesForProducts.length > 0) {
      return shopAddressesForProducts[0];
    }
    return null;
  };

  const renderAddressDisplay = () => {
    if (formData.shippingMethod === "Pickup from Store") {
      const shopAddress = getMainShopAddress();
      if (shopAddress) {
        return (
          <div className="mt-3 p-3 border border-green-200 rounded-md">
            <p className="text-xs flex items-center gap-1">
              <span className="font-medium">Pickup Location:</span> {shopAddress.shop_name} • {shopAddress.shop_address}
            </p>
            <p className="text-xs mt-1">
              Contact: {shopAddress.shop_contact_number || 'Not available'}
            </p>
          </div>
        );
      } else {
        return (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-700">
              Shop address information is not available. Please contact the shop for pickup details.
            </p>
          </div>
        );
      }
    } else {
      if (formData.selectedAddressId && getSelectedAddress()) {
        const selectedAddress = getSelectedAddress();
        return (
          <div className="mt-3 p-3 border border-orange-200 rounded-md">
            <p className="text-xs flex items-center gap-1">
              <Home className="h-3 w-3" />
              <span className="font-medium">Delivery Address:</span> {selectedAddress.recipient_name} • {selectedAddress.full_address?.split(',')[0]}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              📱 Contact: {selectedAddress.recipient_phone}
            </p>
          </div>
        );
      } else {
        return (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700">
              Please select a shipping address for delivery.
            </p>
          </div>
        );
      }
    }
  };

  const isShippingAddressRequired = () => {
    return formData.shippingMethod === "Standard Delivery";
  };

  if (!checkoutData && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Checkout...</h2>
          <p className="text-gray-600">Please wait while we load your cart items</p>
        </div>
      </div>
    );
  }

  const hasOrderedItems = checkoutData?.checkout_items?.some((item: any) => item.is_ordered === true);

  if (checkoutData?.success === false || products.length === 0 || hasOrderedItems) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {hasOrderedItems ? 'Items Already Ordered' : 
            checkoutData?.error ? 'Failed to Load Items' : 'No Items Selected'}
          </h2>
          <p className="text-gray-600 mb-4">
            {hasOrderedItems ? 'Some items in your cart have already been purchased. Please remove them from your cart.' : 
            checkoutData?.error || 'Please add items to your cart first'}
          </p>
          
          <Button onClick={() => window.location.href = '/cart'}>
            Go to Cart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-500">Complete your purchase</p>
          </div>
          <div className="w-24"></div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">⚠️ {error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                  <p className="text-sm text-gray-500">Review your items and shipping details</p>
                </div>
              </div>

              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-orange-50">
                    <div className="flex-shrink-0">
                      {product.img ? (
                        <img src={product.img} alt={product.title} className="h-20 w-20 rounded-lg object-cover border" />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-gray-200 border flex items-center justify-center">
                          <Package className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{product.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">Shop: {product.shop}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">Qty: {product.quantity}</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₱{(product.price * product.quantity).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">₱{product.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6 mt-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Truck className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
                  <p className="text-sm text-gray-500">Choose how you want to receive your order</p>
                </div>
              </div>

              <div className="space-y-4">
                {shippingMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="relative">
                      <input
                        className="peer sr-only"
                        id={`shipping-${method.id}`}
                        type="radio"
                        name="shippingMethod"
                        checked={formData.shippingMethod === method.name}
                        onChange={() => handleShippingMethodChange(method.name)}
                      />
                      <label
                        htmlFor={`shipping-${method.id}`}
                        className="flex cursor-pointer items-center justify-between p-4 border-2 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{method.name}</h3>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            <p className="text-sm text-gray-400 mt-1">Estimated delivery: {method.delivery}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            {method.cost === 0 ? 'FREE' : `₱${method.cost.toFixed(2)}`}
                          </span>
                          <div className="h-4 w-4 rounded-full border-4 border-gray-300 peer-checked:border-orange-500 absolute right-4 top-1/2 -translate-y-1/2"></div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {isShippingAddressRequired() && (
              <div className="mt-8 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">Delivery Address</h3>
                  </div>
                  <Link to="/shipping-address">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Edit className="h-3 w-3" />
                      Manage
                    </Button>
                  </Link>
                </div>

                {shippingAddresses && shippingAddresses.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {shippingAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.selectedAddressId === address.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:bg-orange-50'
                          }`}
                          onClick={() => handleAddressSelect(address.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{address.recipient_name}</span>
                                {address.is_default && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                                    Default
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">{address.recipient_phone}</span>
                              </div>
                              <p className="text-sm text-gray-600">{address.full_address}</p>
                              {address.instructions && (
                                <p className="text-xs text-gray-500 mt-1">
                                  📝 {address.instructions}
                                </p>
                              )}
                            </div>
                            <div className="ml-2">
                              <div className={`h-4 w-4 rounded-full border-2 ${
                                formData.selectedAddressId === address.id
                                  ? 'border-orange-500 bg-orange-500'
                                  : 'border-gray-300'
                              }`}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {formData.selectedAddressId && (
                      <div className="p-3 bg-white border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-orange-700">Selected Address</span>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{getSelectedAddress()?.recipient_name}</p>
                          <p className="text-gray-600">{getSelectedAddress()?.full_address}</p>
                          <p className="text-gray-500 mt-1">{getSelectedAddress()?.recipient_phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="p-3 bg-yellow-50 rounded-full inline-flex mb-3">
                      <MapPin className="h-6 w-6 text-yellow-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">No Shipping Addresses</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      You need to add a shipping address for delivery orders.
                    </p>
                    <Link to="/shipping-address">
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Shipping Address
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {formData.shippingMethod === "Pickup from Store" && shopAddresses.length > 0 && (
              <div className="mt-8 p-4 border rounded-lg">
                <div className="flex items-center gap-2 pb-3 border-b">
                  <h3 className="font-semibold text-gray-900">Pickup Location</h3>
                </div>
                
                <div className="space-y-3">
                  {getShopAddressesForProducts().map((shop, index) => (
                    <div key={index} className="p-3 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium ">{shop.shop_name}</span>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-600">{shop.shop_address}</p>
                        {shop.shop_contact_number && (
                          <p className="text-gray-500 mt-1">Contact: {shop.shop_contact_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-orange-100 rounded-md">
                  <p className="text-xs">
                    <span className="font-medium">Pickup Instructions:</span> Orders are typically ready within 1-2 hours. 
                          Please bring your order confirmation when picking up. Please check with the shop for exact pickup times. 
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Tag className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Voucher & Discounts</h2>
                      <p className="text-sm text-gray-500">Apply a voucher code to save on your order</p>
                    </div>
                  </div>
                </div>
              </div>

              {appliedVoucher ? (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-orange-900 text-lg">{appliedVoucher.code}</p>
                          {appliedVoucher.customer_tier && appliedVoucher.customer_tier !== "all" && (
                            getTierBadge(appliedVoucher.customer_tier)
                          )}
                        </div>
                        <p className="text-sm text-orange-700">{appliedVoucher.name}</p>
                        <p className="text-sm text-orange-600 font-semibold mt-1">
                          -₱{appliedVoucher.discount_amount?.toFixed(2)} discount applied
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveVoucher}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : null}

              {!showVoucherInput && !appliedVoucher ? (
                <Button
                  variant="outline"
                  className="w-full h-12 border-2 border-dashed hover:border-solid"
                  onClick={() => setShowVoucherInput(true)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Enter Voucher Code
                </Button>
              ) : !appliedVoucher ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter voucher code (e.g., SUMMER2024)"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="flex-1 uppercase text-lg font-medium h-12"
                      disabled={voucherLoading}
                    />
                    <Button
                      onClick={handleApplyVoucher}
                      disabled={voucherLoading || !voucherCode.trim()}
                      className="h-12 px-6"
                    >
                      {voucherLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Validating...
                        </div>
                      ) : "Apply"}
                    </Button>
                  </div>
                  {voucherError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">Unable to apply voucher</p>
                        <p className="text-sm text-red-700">{voucherError}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {availableVouchers.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Available Vouchers</h3>
                      {loadingVouchers && (
                        <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full"></div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getAllVouchers().length} vouchers available for ₱{subtotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      variant={activeVoucherCategory === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveVoucherCategory("all")}
                      className="text-xs"
                    >
                      All Vouchers
                    </Button>
                    {availableVouchers.map((category: any, index: number) => (
                      <Button
                        key={index}
                        variant={activeVoucherCategory === category.category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveVoucherCategory(category.category)}
                        className="text-xs flex items-center gap-1"
                      >
                        <span className="truncate max-w-24">{category.category.split(" ")[0]}</span>
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {activeVoucherCategory === "all" ? (
                      availableVouchers.map((category: any, catIndex: number) => (
                        <div key={catIndex} className="space-y-3">
                          <div className="flex items-center gap-2 sticky top-0 bg-white py-2">
                            <h4 className="font-semibold text-gray-900">{category.category}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {category.vouchers?.length || 0} vouchers
                            </span>
                          </div>
                          
                          {category.vouchers?.map((voucher: any, idx: number) => (
                            <div
                              key={`${catIndex}-${idx}`}
                              className="p-4 border rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer group"
                              onClick={() => {
                                setVoucherCode(voucher.code);
                                handleApplyVoucher();
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${voucher.is_recommended ? 'bg-gradient-to-r from-orange-100 to-amber-100' : 'bg-gray-100'}`}>
                                      {voucher.discount_type === 'percentage' ? (
                                        <Percent className={`h-5 w-5 ${voucher.is_recommended ? 'text-orange-600' : 'text-gray-600'}`} />
                                      ) : (
                                        <PhilippinePeso className={`h-5 w-5 ${voucher.is_recommended ? 'text-green-600' : 'text-gray-600'}`} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-gray-900">{voucher.code}</span>
                                        {voucher.is_recommended && (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-full">
                                            <Zap className="h-3 w-3" />
                                            Recommended
                                          </span>
                                        )}
                                        {voucher.customer_tier && voucher.customer_tier !== "all" && (
                                          getTierBadge(voucher.customer_tier)
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 mt-3 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Store className="h-3 w-3 text-gray-400" />
                                      <span className="text-gray-600">{voucher.shop_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-600">Min: ₱{voucher.minimum_spend?.toFixed(2)}</span>
                                    </div>
                                    {voucher.potential_savings > 0 && (
                                      <div className="flex items-center gap-1 ml-auto">
                                        <span className="font-semibold text-orange-600">
                                          Save ₱{voucher.potential_savings?.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="mb-2">
                                    <div className="text-2xl font-bold text-gray-900">
                                      {voucher.discount_type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
                                    </div>
                                    <div className="text-xs text-gray-500">OFF</div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVoucherCode(voucher.code);
                                      handleApplyVoucher();
                                    }}
                                    className="group-hover:bg-orange-600 group-hover:text-white hover:border-orange-600"
                                  >
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      getFilteredVouchers().map((voucher: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 border rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all cursor-pointer group"
                          onClick={() => {
                            setVoucherCode(voucher.code);
                            handleApplyVoucher();
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${voucher.is_recommended ? 'bg-gradient-to-r from-orange-100 to-amber-100' : 'bg-gray-100'}`}>
                                  {voucher.discount_type === 'percentage' ? (
                                    <Percent className={`h-5 w-5 ${voucher.is_recommended ? 'text-orange-600' : 'text-gray-600'}`} />
                                  ) : (
                                    <PhilippinePeso className={`h-5 w-5 ${voucher.is_recommended ? 'text-green-600' : 'text-gray-600'}`} />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg text-gray-900">{voucher.code}</span>
                                    {voucher.is_recommended && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-full">
                                        <Zap className="h-3 w-3" />
                                        Recommended
                                      </span>
                                    )}
                                    {voucher.customer_tier && voucher.customer_tier !== "all" && (
                                      getTierBadge(voucher.customer_tier)
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 mt-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Store className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-600">{voucher.shop_name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Min: ₱{voucher.minimum_spend?.toFixed(2)}</span>
                                </div>
                                {voucher.potential_savings > 0 && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <BadgeCheck className="h-3 w-3 text-green-500" />
                                    <span className="font-semibold text-green-600">
                                      Save ₱{voucher.potential_savings?.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="mb-2">
                                <div className="text-2xl font-bold text-gray-900">
                                  {voucher.discount_type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
                                </div>
                                <div className="text-xs text-gray-500">OFF</div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVoucherCode(voucher.code);
                                  handleApplyVoucher();
                                }}
                                className="group-hover:bg-orange-600 group-hover:text-white hover:border-orange-600"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Order Remarks (Optional)</h3>
              <Input
                type="text"
                placeholder="Any special instructions for this order? (Max 500 characters)"
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                maxLength={500}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2">{formData.remarks.length}/500 characters</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                  <p className="text-sm text-gray-500">Choose your preferred payment option</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const methodName = getPaymentMethodName(method);
                  const methodDescription = getPaymentMethodDescription(method);
                  
                  return (
                    <div key={method.id} className="relative">
                      <input
                        className="peer sr-only"
                        id={`payment-${method.id}`}
                        type="radio"
                        name="paymentMethod"
                        checked={formData.paymentMethod === methodName}
                        onChange={() => handlePaymentMethodChange(method.id)}
                      />
                      <label
                        htmlFor={`payment-${method.id}`}
                        className="flex cursor-pointer items-center gap-4 p-3 border-2 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 hover:bg-orange-50 transition-colors"
                      >
                        <div className={`p-2 rounded-md bg-orange-100`}>
                          <Icon className={`h-5 w-5 text-orange-600`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{methodName}</h3>
                          <p className="text-xs text-gray-500">{methodDescription}</p>
                        </div>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300 peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:border-4"></div>
                      </label>
                    </div>
                  );
                })}
              </div>

              {showEwalletFields && selectedPaymentMethod && (
                <div className="mt-6 p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-white rounded-md">
                      <Smartphone className="h-4 w-4 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-orange-900">{getPaymentMethodName(selectedPaymentMethod)} Details</h3>
                  </div>
                  
                  <p className="text-sm text-orange-700 mb-4">
                    Please provide your  {getPaymentMethodName(selectedPaymentMethod)} account information for payment verification.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ewalletName" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        {selectedPaymentMethod.placeholder?.name}
                      </Label>
                      <Input
                        id="ewalletName"
                        type="text"
                        placeholder={selectedPaymentMethod.placeholder?.name}
                        value={formData.ewalletName}
                        onChange={(e) => handleInputChange("ewalletName", e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>

                    {selectedPaymentMethod.id !== "paypal" && (
                      <div>
                        <Label htmlFor="ewalletNumber" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5" />
                          {selectedPaymentMethod.placeholder?.number}
                        </Label>
                        <Input
                          id="ewalletNumber"
                          type="tel"
                          placeholder={selectedPaymentMethod.placeholder?.number}
                          value={formData.ewalletNumber}
                          onChange={(e) => handleInputChange("ewalletNumber", e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="ewalletEmail" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        {selectedPaymentMethod.placeholder?.email}
                      </Label>
                      <Input
                        id="ewalletEmail"
                        type="email"
                        placeholder={selectedPaymentMethod.placeholder?.email}
                        value={formData.ewalletEmail}
                        onChange={(e) => handleInputChange("ewalletEmail", e.target.value)}
                        className="mt-1"
                        required={selectedPaymentMethod.id === "paypal"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-orange-100 rounded-md">
                    <p className="text-xs text-orange-800">
                      Your payment information is secure and encrypted.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({products.length} items)</span>
                  <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                
                {appliedVoucher && (
                  <div className="flex justify-between text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
                    <span className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      <span>
                        Discount <span className="font-bold">{appliedVoucher.code}</span>
                        {appliedVoucher.customer_tier && appliedVoucher.customer_tier !== "all" && (
                          <span className="ml-2">{getTierBadge(appliedVoucher.customer_tier)}</span>
                        )}
                      </span>
                    </span>
                    <span className="font-bold">-₱{discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? 'FREE' : `₱${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="border-t pt-4 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₱{total.toFixed(2)}</div>
                      {appliedVoucher && (
                        <p className="text-xs text-orange-600 font-semibold mt-1">
                          You saved ₱{discount.toFixed(2)} with {appliedVoucher.code}
                        </p>
                      )}
                      {!appliedVoucher && availableVouchers.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          💡 Apply a voucher to save up to ₱{Math.max(...getAllVouchers().map((v: any) => v.potential_savings || 0)).toFixed(2)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Including VAT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => handleInputChange("agreeTerms", checked === true)}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                    I agree to the Terms of Service and Privacy Policy
                  </Label>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <Button
                size="lg"
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                disabled={!canPlaceOrder}
                onClick={handlePlaceOrder}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing Order...
                  </div>
                ) : (
                  ["Cash on Pickup", "Cash on Delivery"].includes(formData.paymentMethod)
                    ? `Place Order • ₱${total.toFixed(2)}` 
                    : `Pay with ${formData.paymentMethod} • ₱${total.toFixed(2)}`
                )}
              </Button>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <BadgeCheck className="h-3 w-3 text-orange-600" />
                  Secure checkout • Your payment information is encrypted
                </p>
              </div>

              {!formData.agreeTerms && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">
                    Please agree to the Terms of Service and Privacy Policy to continue.
                  </p>
                </div>
              )}

              {showEwalletFields && !isEwalletFieldsValid && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">
                    Please fill in all required  {getPaymentMethodName(selectedPaymentMethod)} details to proceed.
                  </p>
                </div>
              )}

              {renderAddressDisplay()}

              {isShippingAddressRequired() && !formData.selectedAddressId && shippingAddresses.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-700">
                    Please select a shipping address for delivery.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;