"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { ArrowLeft } from "lucide-react";
import type { Route } from './+types/orders'

export function meta(): Route.MetaDescriptors {
  return [
    {
      title: "View Orders",
    },
  ];
}

const CheckoutPage = () => {
  const [formData, setFormData] = useState({
    agreeTerms: true,
    shippingMethod: "fedex1",
    paymentMethod: "cod", // Cash on Delivery by default
  });

  const userAddress = "123 Main Street, Brgy. Central, Manila, Philippines";

  const products = [
    {
      title: "Nike Air Max Pro 8888 - Super Light",
      size: "42EU - 8.5US",
      price: 138.99,
      img: "https://images.unsplash.com/flagged/photo-1556637640-2c80d3201be8?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
      shop: "Nike Official",
      quantity: 1,
    },
    {
      title: "Nike Air Max Pro 8888 - Super Light",
      size: "42EU - 8.5US",
      price: 238.99,
      img: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
      shop: "Nike Official",
      quantity: 2,
    },
  ];

  const shippingMethods = [
    {
      id: "fedex1",
      name: "Pickup from Seller/Shop",
      img: "/public/shop4.jpg",
      delivery: "2-4 Days",
    },
    {
      id: "fedex2",
      name: "Standard Delivery",
      img: "/public/truck.png",
      delivery: "2-4 Days",
    },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const subtotal = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const shippingCost = 8;
  const total = subtotal + shippingCost;

  return (
    <div className="p-4 md:p-6">
      {/* Back button */}
      <div className="flex flex-col items-start border-b bg-white py-4 sm:flex-row sm:px-10 lg:px-20 xl:px-32">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid sm:px-10 lg:grid-cols-2 lg:px-20 xl:px-32">
        {/* Left Column: Products + Shipping */}
        <div className="px-4 pt-8">
          <p className="text-xl font-medium">Order Summary</p>
          <p className="text-gray-400">Check your items. And select a suitable shipping method.</p>

          <div className="mt-8 space-y-3 rounded-lg border bg-white px-2 py-4 sm:px-6">
            {products.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white p-4">
                {/* Product Info */}
                <div className="flex items-center gap-4">
                  <div className="bg-muted flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg">
                    <img src={p.img} alt={p.title} className="h-full w-full rounded-lg object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground line-clamp-2 text-sm font-medium lg:text-base">{p.title}</h3>
                    <p className="text-cart-color mt-1 text-sm">Color: Black</p>
                    <p className="text-xs text-gray-400">{p.shop}</p>
                    <p className="text-gray-400 text-sm">{p.size}</p>
                  </div>
                </div>

                {/* Quantity and Price */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-medium">Qty: {p.quantity}</span>
                  <span className="text-lg font-bold">₱{(p.price * p.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Shipping Address */}
          <div className="mt-6 bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-sm mb-1">Shipping Address</h4>
            <p className="text-gray-700 text-sm">{userAddress}</p>
          </div>

          <p className="mt-8 text-lg font-medium">Shipping Methods</p>
          <form className="mt-5 grid gap-6">
            {shippingMethods.map((s) => (
              <div key={s.id} className="relative">
                <input
                  className="peer hidden"
                  id={s.id}
                  type="radio"
                  name="shipping"
                  checked={formData.shippingMethod === s.id}
                  onChange={() => handleInputChange("shippingMethod", s.id)}
                />
                <span className="peer-checked:border-gray-700 absolute right-4 top-1/2 box-content block h-3 w-3 -translate-y-1/2 rounded-full border-8 border-gray-300 bg-white"></span>
                <label
                  htmlFor={s.id}
                  className="peer-checked:border-2 peer-checked:border-gray-700 peer-checked:bg-gray-50 flex cursor-pointer select-none rounded-lg border border-gray-300 p-4"
                >
                  <img className="w-14 object-contain" src={s.img} alt={s.name} />
                  <div className="ml-5">
                    <span className="mt-2 font-semibold">{s.name}</span>
                    <p className="text-slate-500 text-sm leading-6">Delivery: {s.delivery}</p>
                  </div>
                </label>
              </div>
            ))}
          </form>
        </div>

        {/* Right Column: Payment */}
        <div className="mt-10 bg-gray-50 px-4 pt-8 lg:mt-0">
          <p className="text-xl font-medium">Payment Details</p>
          <p className="text-gray-400">Complete your order by providing your payment method.</p>

          <div className="mt-4 space-y-4">
            <Label className="block text-sm font-medium">Select Payment Method</Label>

            <div className="flex flex-col space-y-2">
              <label className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 hover:bg-gray-100">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={formData.paymentMethod === "cod"}
                  onChange={() => handleInputChange("paymentMethod", "cod")}
                  className="mr-3"
                />
                Cash on Delivery
              </label>

              <label className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 hover:bg-gray-100">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="gcash"
                  checked={formData.paymentMethod === "gcash"}
                  onChange={() => handleInputChange("paymentMethod", "gcash")}
                  className="mr-3"
                />
                GCash
              </label>

              <label className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 hover:bg-gray-100">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paymaya"
                  checked={formData.paymentMethod === "paymaya"}
                  onChange={() => handleInputChange("paymentMethod", "paymaya")}
                  className="mr-3"
                />
                PayMaya
              </label>

              <label className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 hover:bg-gray-100">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={formData.paymentMethod === "paypal"}
                  onChange={() => handleInputChange("paymentMethod", "paypal")}
                  className="mr-3"
                />
                PayPal
              </label>
            </div>

            {/* Summary */}
            <div className="mt-6 border-t border-b py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Subtotal</p>
                <p className="font-semibold text-gray-900">₱{subtotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Shipping</p>
                <p className="font-semibold text-gray-900">₱{shippingCost.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Total</p>
              <p className="text-2xl font-semibold text-gray-900">₱{total.toFixed(2)}</p>
            </div>

            <div className="flex items-start space-x-2 mt-4">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) => handleInputChange("agreeTerms", checked === true)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-foreground text-sm leading-5">
                By clicking this you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Services</a> and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </Label>
            </div>

            <Button size="lg" className="w-full mt-4" disabled={!formData.agreeTerms}>
              Place Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
