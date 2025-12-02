// cart-item.tsx
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

interface CartItemProps {
  id: string;
  name: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
  shop_name: string;
  selected: boolean;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string, checked: boolean) => void;
}

export function CartItem({
  id,
  name,
  color,
  price,
  quantity,
  image,
  shop_name,
  selected,
  onUpdateQuantity,
  onRemove,
  onSelect,
}: CartItemProps) {
  const subtotal = price * quantity;

  return (
    <div className="flex items-center py-4 border-b last:border-b-0">
      {/* Selection Checkbox */}
      <div className="pr-4">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(id, Boolean(checked))}
          className="h-4 w-4"
        />
      </div>

      {/* Product Image */}
      <div className="flex-shrink-0 w-20 h-20">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover rounded-md"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 px-4 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{name}</h3>
        {color && <p className="text-sm text-gray-500">Color: {color}</p>}
        <p className="text-sm text-gray-500">{shop_name}</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">₱{price.toFixed(2)}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2 min-w-[100px] justify-center">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(id, Math.max(1, quantity - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-10 text-center font-medium">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(id, quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Subtotal */}
      <div className="min-w-[100px] text-right font-semibold text-gray-900">
        ₱{subtotal.toFixed(2)}
      </div>

      {/* Remove Button */}
      <div className="min-w-[40px] text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700"
          onClick={() => onRemove(id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}