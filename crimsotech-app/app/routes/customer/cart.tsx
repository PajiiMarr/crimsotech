"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Tag, 
  Trash2,
  Plus,
  Minus,
  Store,
  ChevronRight,
  X,
  Package,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import type { Route } from "./+types/cart";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import { useNavigate } from "react-router";
import AxiosInstance from "~/components/axios/Axios";

// ------------------ TYPES ------------------
export type CartItemType = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  shop_name: string;
  shop_id?: string;
  selected: boolean;
  added_at?: string;
  subtotal?: number;
};

type MediaFile = {
  file_url: string;
  file_type: string;
};

type ProductDetails = {
  id: string;
  name: string;
  price: string;
  shop_name: string;
  shop_id?: string;
  media_files: MediaFile[] | null;
};

type ApiCartItem = {
  id: string;
  product: string;
  product_details: ProductDetails | null;
  item_name: string;
  item_price: string;
  item_image: string | null;
  quantity: number;
  added_at: string;
  subtotal: number;
};

type CartApiResponse = {
  success: boolean;
  cart_items: ApiCartItem[];
  error?: string;
};

// ------------------ META ------------------
export function meta(): Route.MetaDescriptors {
  return [{ title: "Cart" }];
}

// ------------------ LOADER ------------------
export async function loader({ request }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");

  return {
    user: { 
      id: userId,
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isCustomer: true,
      username: userId ? `user_${userId}` : 'guest',
      email: userId ? `user_${userId}@example.com` : 'guest@example.com',
    },
    headers: { "Set-Cookie": await commitSession(session) },
  };
}

// ------------------ COMPONENTS ------------------

// Shop Header Component with Select All for Shop
const ShopHeader = ({ 
  shopName, 
  itemCount, 
  shopTotal,
  allSelected,
  onSelectShop,
  isExpanded,
  onToggleExpand
}: { 
  shopName: string;
  itemCount: number;
  shopTotal: number;
  allSelected: boolean;
  onSelectShop: (checked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  return (
    <div className="bg-white border-b p-3 flex items-center justify-between hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectShop}
          className="h-4 w-4"
        />
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <div className="p-1.5 bg-blue-50 rounded-md">
            <Store className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-gray-900">{shopName}</h3>
            <p className="text-xs text-gray-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₱{shopTotal.toFixed(2)}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
};

// Compact Cart Item
const CompactCartItem = ({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  onSelect 
}: { 
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string, checked: boolean) => void;
}) => {
  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
      <Checkbox
        checked={item.selected}
        onCheckedChange={(checked) => onSelect(item.id, Boolean(checked))}
        className="h-4 w-4"
      />
      
      <div className="h-16 w-16 flex-shrink-0">
        <img
          src={item.image || "/api/placeholder/64/64"}
          alt={item.name}
          className="h-full w-full object-cover rounded-md bg-gray-100"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
            {item.name}
          </h3>
          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            ₱{(item.price * item.quantity).toFixed(2)}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            ₱{item.price.toFixed(2)} each
          </p>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 rounded-l"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded-r"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            
            <button
              onClick={() => onRemove(item.id)}
              className="text-gray-400 hover:text-red-600 p-1 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Shop Section Component
const ShopSection = ({ 
  shopName, 
  items,
  onUpdateQuantity,
  onRemove,
  onSelectItem,
  onSelectShop
}: {
  shopName: string;
  items: CartItemType[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  onSelectShop: (shopName: string, checked: boolean) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const shopTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const allSelected = items.every(item => item.selected);
  const selectedItems = items.filter(item => item.selected);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="border rounded-lg mb-4 overflow-hidden bg-white shadow-sm">
      <ShopHeader
        shopName={shopName}
        itemCount={items.length}
        shopTotal={shopTotal}
        allSelected={allSelected}
        onSelectShop={(checked) => onSelectShop(shopName, checked)}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      {isExpanded && (
        <>
          <div className="divide-y">
            {items.map((item) => (
              <CompactCartItem
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
                onSelect={onSelectItem}
              />
            ))}
          </div>
          
          {/* Shop Summary */}
          <div className="px-3 py-2 bg-gray-50 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Selected from {shopName}: {selectedItems.length} of {items.length}
              </span>
              <span className="font-semibold">₱{selectedTotal.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Simple Coupon Section
const SimpleCouponSection = ({ onApplyCoupon }: { onApplyCoupon: (code: string) => void }) => {
  const [couponCode, setCouponCode] = useState("");

  const handleApply = () => {
    if (couponCode.trim()) {
      onApplyCoupon(couponCode.trim());
      setCouponCode("");
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">Have a coupon?</span>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="flex-1 text-sm border rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
        />
        <Button
          onClick={handleApply}
          disabled={!couponCode.trim()}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

// Simple Order Summary
const SimpleOrderSummary = ({
  subtotal,
  discount,
  delivery,
  tax,
  onProceedToCheckout,
  itemCount,
  shopCount
}: {
  subtotal: number;
  discount: number;
  delivery: number;
  tax: number;
  onProceedToCheckout: () => void;
  itemCount: number;
  shopCount: number;
}) => {
  const total = subtotal - discount + delivery + tax;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
      
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Items ({itemCount})</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Shops ({shopCount})</span>
          <Badge variant="outline" className="text-xs">
            Separate deliveries
          </Badge>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Discount</span>
            <span className="text-green-600">-₱{discount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Delivery (estimated)</span>
          <span>₱{delivery.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Tax</span>
          <span>₱{tax.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border-t pt-4 mb-4">
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>₱{total.toFixed(2)}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          From {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
        </div>
      </div>
      
      <Button
        onClick={onProceedToCheckout}
        disabled={itemCount === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 h-10"
      >
        <Package className="h-4 w-4 mr-2" />
        Proceed to Checkout ({itemCount})
      </Button>
    </div>
  );
};

// ------------------ TRANSFORM API DATA ------------------
const transformApiData = (apiItems: ApiCartItem[]): CartItemType[] => {
  return apiItems.map((item) => {
    const productName = item.product_details?.name || item.item_name || "Product";
    const productPrice = item.product_details?.price || item.item_price || "0";
    const shopName = item.product_details?.shop_name || "Store";
    const shopId = item.product_details?.shop_id;
    const price = parseFloat(productPrice) || 0;
    
    let image: string | null = null;
    
    if (item.item_image) {
      image = item.item_image;
    } else if (item.product_details?.media_files && 
               item.product_details.media_files.length > 0 && 
               item.product_details.media_files[0]?.file_url) {
      image = item.product_details.media_files[0].file_url;
    }
    
    return {
      id: item.id,
      product_id: item.product || item.product_details?.id || item.id,
      name: productName,
      price: price,
      quantity: item.quantity || 1,
      image: image,
      shop_name: shopName,
      shop_id: shopId,
      selected: true,
      added_at: item.added_at,
      subtotal: item.subtotal || (price * item.quantity),
    };
  });
};

// ------------------ MAIN COMPONENT ------------------
export default function Cart({ loaderData }: Route.ComponentProps) {
  const user = loaderData?.user;
  const userId = user?.id;
  
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch cart items
  useEffect(() => {
    if (!userId) {
      setError("Please login to view your cart");
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        setLoading(true);
        const response = await AxiosInstance.get<CartApiResponse>("/view-cart/", {
          params: { user_id: userId }
        });
        
        if (response.data.success && response.data.cart_items) {
          const transformedItems = transformApiData(response.data.cart_items);
          setCartItems(transformedItems);
        } else {
          setCartItems([]);
        }
      } catch (err: any) {
        console.error("Cart fetch error:", err);
        setError(err.response?.status === 401 ? "Please login to view your cart" : "Failed to load cart");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId]);

  // Item handlers
  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }

    try {
      await AxiosInstance.put(`/view-cart/items/${id}/update/`, { 
        user_id: userId,
        quantity 
      });
      
      setCartItems((items) => 
        items.map((item) => {
          if (item.id === id) {
            return { 
              ...item, 
              quantity,
              subtotal: item.price * quantity
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await AxiosInstance.delete(`/view-cart/items/${id}/remove/`, {
        params: { user_id: userId }
      });
      setCartItems((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setCartItems((items) => 
      items.map((item) => 
        item.id === id ? { ...item, selected: checked } : item
      )
    );
  };

  const handleSelectShop = (shopName: string, checked: boolean) => {
    setCartItems((items) => 
      items.map((item) => 
        item.shop_name === shopName ? { ...item, selected: checked } : item
      )
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setCartItems((items) => 
      items.map((item) => ({ ...item, selected: checked }))
    );
  };

  // Group items by shop
  const groupedItems = cartItems.reduce<Record<string, CartItemType[]>>((acc, item) => {
    if (!acc[item.shop_name]) {
      acc[item.shop_name] = [];
    }
    acc[item.shop_name].push(item);
    return acc;
  }, {});

  const shopCount = Object.keys(groupedItems).length;

  // Calculations
  const selectedItems = cartItems.filter((item) => item.selected);
  const selectedShops = new Set(selectedItems.map(item => item.shop_name)).size;
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0;
  const delivery = selectedItems.length > 0 ? 50.00 : 0; // Base delivery
  const tax = subtotal * 0.12;

  // Navigation - UPDATED TO NAVIGATE TO ORDERS.TSX
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select items to checkout");
      return;
    }
    
    // Store checkout data if needed in orders page
    try {
      // You can store the selected items if needed for the orders page
      localStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
      localStorage.setItem('checkoutSummary', JSON.stringify({
        subtotal,
        discount,
        delivery,
        tax,
        total: subtotal - discount + delivery + tax,
        itemCount: selectedItems.length,
        shopCount: selectedShops
      }));
    } catch (err) {
      console.error("Failed to store checkout data:", err);
    }
    
    // Navigate to orders page
    navigate("/orders");
  };

  const handleApplyCoupon = (code: string) => {
    console.log("Applying coupon:", code);
    // Implement coupon validation
  };

  // Loading state
  if (loading) {
    return (
      <UserProvider user={user || { id: 'loading', isCustomer: true, username: 'loading', email: 'loading@example.com' }}>
        <SidebarLayout>
          <div className="w-full p-4 lg:p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="flex flex-col lg:flex-row gap-6 w-full">
              <div className="lg:w-2/3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-3 border rounded">
                    <Skeleton className="h-16 w-16" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:w-1/3">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <UserProvider user={user || { id: 'guest', isCustomer: false, username: 'guest', email: 'guest@example.com' }}>
        <SidebarLayout>
          <div className="w-full min-h-[60vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{error}</h3>
              <div className="space-y-2">
                {error.includes("login") ? (
                  <>
                    <Button 
                      onClick={() => navigate("/login")} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Go to Login
                    </Button>
                    <Button 
                      onClick={() => navigate("/")} 
                      variant="outline" 
                      className="w-full"
                    >
                      Continue Shopping
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => window.location.reload()} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Try Again
                    </Button>
                    <Button 
                      onClick={() => navigate("/")} 
                      variant="outline" 
                      className="w-full"
                    >
                      Continue Shopping
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  const safeUser = user || {
    id: 'guest',
    isAdmin: false,
    isRider: false,
    isModerator: false,
    isCustomer: false,
    username: 'guest',
    email: 'guest@example.com'
  };

  return (
    <UserProvider user={safeUser}>
      <SidebarLayout>
        <div className="w-full min-h-screen bg-gray-50">
          <div className="w-full p-4 lg:p-6">
            {/* Header - Full Width */}
            <div className="mb-6 w-full">
              <div className="flex items-center justify-between w-full">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />
                    Shopping Cart ({cartItems.length})
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedItems.length} items selected • ₱{subtotal.toFixed(2)} • {shopCount} shops
                  </p>
                </div>
                {cartItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="hidden lg:flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Continue Shopping
                  </Button>
                )}
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto text-center py-12 lg:py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <ShoppingCart className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg lg:text-xl font-medium mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Add items from your favorite shops to get started
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate("/")}
                    className="bg-blue-600 hover:bg-blue-700 px-6"
                  >
                    Start Shopping
                  </Button>
                  <Button 
                    onClick={() => navigate(-1)} 
                    variant="outline"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 w-full">
                {/* Left Column - Cart Items - Takes 2/3 width */}
                <div className="lg:w-2/3">
                  {/* Selection Bar - Full Width */}
                  <div className="bg-white rounded-lg p-3 mb-4 flex items-center justify-between border shadow-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={cartItems.length > 0 && cartItems.every((item) => item.selected)}
                        onCheckedChange={handleSelectAll}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">Select All Items ({cartItems.length})</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {shopCount} {shopCount === 1 ? 'shop' : 'shops'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          selectedItems.forEach(item => removeItem(item.id));
                        }}
                        disabled={selectedItems.length === 0}
                        className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Selected
                      </Button>
                    </div>
                  </div>

                  {/* Shop Sections */}
                  {Object.entries(groupedItems).map(([shopName, items]) => (
                    <ShopSection
                      key={shopName}
                      shopName={shopName}
                      items={items}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                      onSelectItem={handleSelectItem}
                      onSelectShop={handleSelectShop}
                    />
                  ))}
                  
                  {/* Mobile Continue Button */}
                  {cartItems.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="w-full mt-4 lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Continue Shopping
                    </Button>
                  )}
                </div>

                {/* Right Column - Order Summary - Takes 1/3 width */}
                <div className="lg:w-1/3">
                  <div className="sticky top-6 space-y-4">
                    <SimpleCouponSection onApplyCoupon={handleApplyCoupon} />
                    <SimpleOrderSummary
                      subtotal={subtotal}
                      discount={discount}
                      delivery={delivery}
                      tax={tax}
                      onProceedToCheckout={handleCheckout}
                      itemCount={selectedItems.length}
                      shopCount={selectedShops}
                    />
                    
                    {/* Additional Info */}
                    <div className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm font-medium">Multi-Shop Order</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        Items from different shops will be delivered separately. Each shop may have different delivery times.
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Shops in order:</span>
                          <span className="font-medium">{selectedShops}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total items:</span>
                          <span className="font-medium">{selectedItems.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}