"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { ArrowLeft, Package, Truck, Store, CreditCard, Wallet, Globe, Smartphone, User } from "lucide-react";
import type { Route } from './+types/orders'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "Checkout - Complete Your Order",
    },
  ];
}

const CheckoutPage = () => {
  const [formData, setFormData] = useState({
    agreeTerms: true,
    shippingMethod: "pickup",
    paymentMethod: "cod",
    // E-wallet fields
    ewalletName: "",
    ewalletNumber: "",
    ewalletEmail: "",
  });

  const userAddress = {
    name: "John Doe",
    street: "123 Main Street",
    barangay: "Brgy. Central",
    city: "Manila",
    province: "Metro Manila",
    zipCode: "1000",
    phone: "+63 912 345 6789",
    email: "john.doe@example.com"
  };

  const products = [
    {
      id: 1,
      title: "Nike Air Max Pro 8888 - Super Light Edition",
      size: "42EU - 8.5US",
      color: "Black/White",
      price: 138.99,
      img: "https://images.unsplash.com/flagged/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
      shop: "Nike Official Store",
      quantity: 1,
    },
    {
      id: 2,
      title: "Nike Air Force 1 '07",
      size: "43EU - 9US",
      color: "White",
      price: 238.99,
      img: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
      shop: "Nike Official Store",
      quantity: 2,
    },
  ];

  const shippingMethods = [
    {
      id: "pickup",
      name: "Pickup from Store",
      description: "Collect your order directly from the seller's shop",
      icon: Store,
      delivery: "Ready in 1-2 hours",
      cost: 0,
    },
    {
      id: "standard",
      name: "Standard Delivery",
      description: "Door-to-door delivery service",
      icon: Truck,
      delivery: "2-4 business days",
      cost: 8.00,
    },
  ];

  const paymentMethods = [
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      icon: Wallet,
      iconColor: "text-green-600",
      requiresDetails: false,
    },
    {
      id: "gcash",
      name: "GCash",
      description: "Pay instantly via GCash",
      icon: Smartphone,
      iconColor: "text-blue-600",
      requiresDetails: true,
      placeholder: {
        name: "GCash Account Name",
        number: "GCash Mobile Number",
        email: "GCash Registered Email (optional)",
      }
    },
    {
      id: "paymaya",
      name: "PayMaya",
      description: "Pay using PayMaya wallet",
      icon: CreditCard,
      iconColor: "text-purple-600",
      requiresDetails: true,
      placeholder: {
        name: "PayMaya Account Name",
        number: "PayMaya Mobile Number",
        email: "PayMaya Registered Email (optional)",
      }
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Pay securely via PayPal",
      icon: Globe,
      iconColor: "text-blue-500",
      requiresDetails: true,
      placeholder: {
        name: "PayPal Account Name",
        number: "PayPal Phone Number (optional)",
        email: "PayPal Email Address",
      }
    },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentMethodChange = (methodId: string) => {
    handleInputChange("paymentMethod", methodId);
    // Clear e-wallet fields when switching to COD
    if (methodId === "cod") {
      setFormData(prev => ({
        ...prev,
        ewalletName: "",
        ewalletNumber: "",
        ewalletEmail: ""
      }));
    }
  };

  const subtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const shippingCost = formData.shippingMethod === "pickup" ? 0 : 8.00;
  const tax = subtotal * 0.12;
  const total = subtotal + shippingCost + tax;

  const selectedPaymentMethod = paymentMethods.find(method => method.id === formData.paymentMethod);
  const showEwalletFields = selectedPaymentMethod?.requiresDetails;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-500">Complete your purchase</p>
          </div>
          <div className="w-24"></div> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                  <p className="text-sm text-gray-500">Review your items and shipping details</p>
                </div>
              </div>

              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      <img
                        src={product.img}
                        alt={product.title}
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{product.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-500">Shop: {product.shop}</span>
                        <span className="text-xs text-gray-500">Size: {product.size}</span>
                        <span className="text-xs text-gray-500">Color: {product.color}</span>
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

              {/* Shipping Address */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-50 rounded-md">
                    <Truck className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Shipping Address</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{userAddress.name}</p>
                  <p>{userAddress.street}</p>
                  <p>{userAddress.barangay}, {userAddress.city}</p>
                  <p>{userAddress.province} {userAddress.zipCode}</p>
                  <div className="pt-2 border-t">
                    <p className="text-gray-600">📱 {userAddress.phone}</p>
                    <p className="text-gray-600">✉️ {userAddress.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  Change Address
                </Button>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Truck className="h-5 w-5 text-purple-600" />
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
                        checked={formData.shippingMethod === method.id}
                        onChange={() => handleInputChange("shippingMethod", method.id)}
                      />
                      <label
                        htmlFor={`shipping-${method.id}`}
                        className="flex cursor-pointer items-center justify-between p-4 border-2 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${method.id === 'pickup' ? 'bg-green-50' : 'bg-blue-50'}`}>
                            <Icon className={`h-6 w-6 ${method.id === 'pickup' ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
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
                          <div className="h-4 w-4 rounded-full border-4 border-gray-300 peer-checked:border-blue-500 absolute right-4 top-1/2 -translate-y-1/2"></div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Payment & Summary */}
          <div className="space-y-6">
            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                  <p className="text-sm text-gray-500">Choose your preferred payment option</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="relative">
                      <input
                        className="peer sr-only"
                        id={`payment-${method.id}`}
                        type="radio"
                        name="paymentMethod"
                        checked={formData.paymentMethod === method.id}
                        onChange={() => handlePaymentMethodChange(method.id)}
                      />
                      <label
                        htmlFor={`payment-${method.id}`}
                        className="flex cursor-pointer items-center gap-4 p-3 border-2 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-md ${method.iconColor.replace('text-', 'bg-')} bg-opacity-10`}>
                          <Icon className={`h-5 w-5 ${method.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{method.name}</h3>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300 peer-checked:border-blue-500 peer-checked:bg-blue-500 peer-checked:border-4"></div>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* E-wallet Details Form */}
              {showEwalletFields && selectedPaymentMethod && (
                <div className="mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-white rounded-md">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-blue-900">{selectedPaymentMethod.name} Details</h3>
                  </div>
                  
                  <p className="text-sm text-blue-700 mb-4">
                    Please provide your {selectedPaymentMethod.name} account information for payment verification.
                  </p>

                  <div className="space-y-4">
                    {/* Account Name */}
                    <div>
                      <Label htmlFor="ewalletName" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        {selectedPaymentMethod.placeholder?.name}
                      </Label>
                      <Input
                        id="ewalletName"
                        type="text"
                        placeholder="e.g., Juan Dela Cruz"
                        value={formData.ewalletName}
                        onChange={(e) => handleInputChange("ewalletName", e.target.value)}
                        className="mt-1"
                        required={selectedPaymentMethod.requiresDetails}
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <Label htmlFor="ewalletNumber" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" />
                        {selectedPaymentMethod.placeholder?.number}
                      </Label>
                      <Input
                        id="ewalletNumber"
                        type="tel"
                        placeholder="e.g., 09123456789"
                        value={formData.ewalletNumber}
                        onChange={(e) => handleInputChange("ewalletNumber", e.target.value)}
                        className="mt-1"
                        required={selectedPaymentMethod.requiresDetails && selectedPaymentMethod.id !== "paypal"}
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <Label htmlFor="ewalletEmail" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        {selectedPaymentMethod.placeholder?.email}
                      </Label>
                      <Input
                        id="ewalletEmail"
                        type="email"
                        placeholder="e.g., juan.delacruz@email.com"
                        value={formData.ewalletEmail}
                        onChange={(e) => handleInputChange("ewalletEmail", e.target.value)}
                        className="mt-1"
                        required={selectedPaymentMethod.requiresDetails && selectedPaymentMethod.id === "paypal"}
                      />
                    </div>
                  </div>

                  {/* Security Note */}
                  <div className="mt-4 p-3 bg-blue-100 rounded-md">
                    <p className="text-xs text-blue-800">
                      🔒 Your payment information is secure. We only use this information to verify your {selectedPaymentMethod.name} payment.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({products.length} items)</span>
                  <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? 'FREE' : `₱${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (12%)</span>
                  <span className="font-medium">₱{tax.toFixed(2)}</span>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₱{total.toFixed(2)}</div>
                      <p className="text-xs text-gray-500">Including VAT</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => handleInputChange("agreeTerms", checked === true)}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-600 leading-tight">
                    I agree to the{" "}
                    <a href="#" className="text-blue-600 hover:underline font-medium">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>
                  </Label>
                </div>
              </div>
            </div>

            {/* Validation for e-wallet fields */}
            {(() => {
              const isEwalletFieldsValid = !showEwalletFields || (
                formData.ewalletName.trim() !== "" &&
                formData.ewalletNumber.trim() !== "" &&
                (selectedPaymentMethod?.id !== "paypal" || formData.ewalletEmail.trim() !== "")
              );

              const canPlaceOrder = formData.agreeTerms && isEwalletFieldsValid;

              return (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  {/* Place Order Button */}
                  <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={!canPlaceOrder}
                  >
                    {formData.paymentMethod === "cod" ? "Place Order" : `Pay with ${selectedPaymentMethod?.name}`} • ₱{total.toFixed(2)}
                  </Button>

                  {/* Security Note */}
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      🔒 Secure checkout • Your payment information is encrypted
                    </p>
                  </div>

                  {/* E-wallet validation warning */}
                  {showEwalletFields && !isEwalletFieldsValid && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700">
                        ⚠️ Please fill in all required {selectedPaymentMethod?.name} details to proceed.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;