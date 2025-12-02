import { Button } from "~/components/ui/button"; 
import { useNavigate } from 'react-router-dom'; 

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  delivery: number;
  tax: number;
  onProceedToCheckout?: () => void; // Optional prop for a checkout button action
}

export const OrderSummary = ({
  subtotal,
  discount,
  delivery,
  tax,
  onProceedToCheckout
}: OrderSummaryProps) => {
  // Calculate the final total
  const total = subtotal - discount + delivery + tax;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm"> {/* Added shadow and bg-white for a cleaner card look */}
      <h2 className="mb-5 text-xl font-semibold text-gray-800">Order Summary</h2> {/* Adjusted margin-bottom */}

      <div className="space-y-3"> {/* Slightly reduced vertical space */}
        {/* Subtotal - Added this for clarity, as it's a common summary item */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Subtotal</span> {/* Smaller text */}
          <span className="text-sm font-medium text-gray-800">₱{subtotal.toFixed(2)}</span> {/* Smaller text, consistent currency */}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Discount</span> {/* Smaller text */}
          <span className="text-sm font-medium text-red-500">-₱{discount.toFixed(2)}</span> {/* Discount typically negative and red */}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Delivery</span> {/* Smaller text */}
          <span className="text-sm font-medium text-gray-800">₱{delivery.toFixed(2)}</span> {/* Smaller text, consistent currency */}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Tax</span> {/* Smaller text */}
          <span className="text-sm font-medium text-gray-800">₱{tax.toFixed(2)}</span> {/* Smaller text, consistent currency */}
        </div>

        <hr className="my-4 border-gray-200" /> {/* Thinner, lighter divider, adjusted margin */}

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-800">Order Total</span> {/* Slightly smaller total label */}
          <span className="text-xl font-bold text-gray-900">₱{total.toFixed(2)}</span> {/* Total remains prominent, consistent currency */}
        </div>
      </div>

      {/* Optional Checkout Button */}
      {onProceedToCheckout && (
        <Button
          onClick={onProceedToCheckout}
          className="mt-6 w-full py-2 text-base font-semibold" // Adjusted padding and font size
        >
          Proceed to Checkout
        </Button>
      )}
    </div>
  );
};