import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState } from "react";

interface CouponSectionProps {
  onApplyCoupon: (code: string) => void;
}

export const CouponSection = ({ onApplyCoupon }: CouponSectionProps) => {
  const [couponCode, setCouponCode] = useState("");

  const handleApply = () => {
    if (couponCode.trim()) {
      onApplyCoupon(couponCode.trim());
    }
  };

  return (
    <div className="bg-card border-cart-border rounded-lg border p-6">
      <h2 className="mb-4 text-xl font-semibold">Coupon Code</h2>
      <div className="space-y-4">
        <Input
          placeholder="Enter Your Coupon Code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="h-12"
        />
        <Button onClick={handleApply} className="bg-primary hover:bg-primary/90 h-12 w-full">
          Apply Your Coupon
        </Button>
      </div>
    </div>
  );
};