// cart.tsx - UPDATED TYPES AND DATA HANDLING
"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingCart, Tag, MapPin } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/cart";
import SidebarLayout from "~/components/layouts/sidebar";
import { UserProvider } from "~/components/providers/user-role-provider";
import { CartItem } from "~/components/customer/cart-item";
import { CouponSection } from "~/components/customer/coupon-section";
import { OrderSummary } from "~/components/customer/order-summary";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "~/components/axios/Axios";

// ------------------ TYPES ------------------
export type CartItemType = {
  id: string;
  name: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
  shop_name: string;
  selected: boolean;
  product_id?: string;
};

// ------------------ META ------------------
export function meta(): Route.MetaDescriptors {
  return [{ title: "Shopping Cart" }];
}

// ------------------ LOADER ------------------
export async function loader({ request }: Route.LoaderArgs) {
  const { getSession, commitSession } = await import('~/sessions.server');
  const session = await getSession(request.headers.get("Cookie"));

  const userId = session.get("userId");

  // Return a proper user object with all required properties
  return {
    user: { 
      id: userId,
      // Add all the properties that UserProvider expects
      isAdmin: false,
      isRider: false,
      isModerator: false,
      isCustomer: true,
      // Add any other required properties
      username: userId ? `user_${userId}` : 'guest',
    },
    headers: { "Set-Cookie": await commitSession(session) },
  };
}

// ------------------ COUPON SECTION ------------------
const ProfessionalCouponSection = ({ onApplyCoupon }: { onApplyCoupon: (code: string) => void }) => {
  const [couponCode, setCouponCode] = useState("");
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (couponCode.trim()) {
      onApplyCoupon(couponCode.trim());
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center text-base font-semibold text-gray-800">
        <Tag className="mr-2 h-4 w-4 text-gray-500" />
        Discount Code
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter coupon code"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
        <Button
          onClick={handleApply}
          disabled={!couponCode.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
        >
          {applied ? "Applied!" : "Apply"}
        </Button>
      </div>
    </div>
  );
};

// ------------------ MAIN COMPONENT ------------------
export default function Cart({ loaderData }: Route.ComponentProps) {
  const user = loaderData?.user; // Get the full user object
  const userId = user?.id; // Extract userId
  
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // ------------------ FETCH CART ITEMS ------------------
  useEffect(() => {
    if (!userId) {
      setError("Please login to view your cart");
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Call your Django API endpoint
        const response = await AxiosInstance.get("/view-cart/", {
          params: { user_id: userId }
        });
        
        console.log("Cart API Response:", response.data); // Debug log
        
        // Check if response has success and cart_items
        if (response.data.success && Array.isArray(response.data.cart_items)) {
          // Transform the API response to match CartItemType
          const transformedItems: CartItemType[] = response.data.cart_items.map((item: any) => {
            // Extract product details
            const product = item.product || {};
            const productName = product.name || "Unknown Product";
            const productPrice = product.price || 0;
            const shop = product.shop || {};
            const shopName = shop.name || "Unknown Shop";
            
            // Convert price to number if it's a string
            const price = typeof productPrice === 'string' 
              ? parseFloat(productPrice) 
              : Number(productPrice);
            
            // Get image from media_files or use default
            let image = "/public/default.jpg";
            if (product.media_files && Array.isArray(product.media_files) && product.media_files.length > 0) {
              image = product.media_files[0].file_url || image;
            }
            
            return {
              id: item.id || "",
              name: productName,
              color: item.color || "", // Your cart items might not have color
              price: price,
              quantity: item.quantity || 1,
              image: image,
              shop_name: shopName,
              selected: true, // Default all items to selected
              product_id: product.id || item.product_id || "",
            };
          });
          
          setCartItems(transformedItems);
        } else {
          // Handle case where cart_items might be empty or in different format
          const errorMsg = response.data.error || "No cart items found or invalid response format";
          setError(errorMsg);
          
          // If cart is empty, just set empty array (not an error)
          if (response.data.success && (!response.data.cart_items || response.data.cart_items.length === 0)) {
            setCartItems([]);
            setError(null);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch cart items:", err);
        // Handle different error scenarios
        if (err.response?.status === 400) {
          setError("User ID is required");
        } else if (err.response?.status === 404) {
          setError("User not found or cart is empty");
        } else if (err.code === 'ERR_NETWORK') {
          setError("Network error. Please check your connection.");
        } else {
          setError(err.response?.data?.error || "Failed to load cart items");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId]);

  // ------------------ ITEM HANDLERS ------------------
  const updateQuantity = async (id: string, quantity: number) => {
    try {
      const response = await AxiosInstance.put(`/view-cart/items/${id}/update/`, { 
        user_id: userId,
        quantity 
      });
      
      if (response.data.success) {
        setCartItems((items) => 
          items.map((item) => (item.id === id ? { ...item, quantity } : item))
        );
      }
    } catch (err: any) {
      console.error("Error updating quantity:", err);
      alert(err.response?.data?.error || "Failed to update quantity");
    }
  };

  const removeItem = async (id: string) => {
    try {
      const response = await AxiosInstance.delete(`/view-cart/items/${id}/remove/`, {
        params: { user_id: userId }
      });
      
      if (response.data.success) {
        setCartItems((items) => items.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      console.error("Error removing item:", err);
      alert(err.response?.data?.error || "Failed to remove item");
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setCartItems((items) => items.map((item) => (item.id === id ? { ...item, selected: checked } : item)));
  };

  const handleSelectShop = (shopName: string, checked: boolean) => {
    setCartItems((items) => items.map((item) => (item.shop_name === shopName ? { ...item, selected: checked } : item)));
  };

  // ------------------ GROUP ITEMS BY SHOP ------------------
  const groupedItems = cartItems.reduce<Record<string, CartItemType[]>>((acc, item) => {
    if (!acc[item.shop_name]) acc[item.shop_name] = [];
    acc[item.shop_name].push(item);
    return acc;
  }, {});

  const allItemsSelected = cartItems.length > 0 && cartItems.every((item) => item.selected);
  const handleSelectAll = (checked: boolean) => {
    setCartItems((items) => items.map((item) => ({ ...item, selected: checked })));
  };

  // ------------------ ORDER SUMMARY CALCULATIONS ------------------
  const selectedItems = cartItems.filter((item) => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0;
  const delivery = selectedItems.length > 0 ? 50.00 : 0;
  const taxRate = 0.05;
  const tax = subtotal * taxRate;

  // ------------------ NAVIGATE TO CHECKOUT ------------------
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to proceed.");
      return;
    }
    const selectedIds = selectedItems.map((item) => item.id).join(",");
    navigate(`/checkout/?items=${selectedIds}`);
  };

  // ------------------ COUPON HANDLER ------------------
  const handleApplyCoupon = (code: string) => {
    console.log("Applying coupon:", code);
  };

  // ------------------ LOADING & ERROR STATES ------------------
  if (loading) {
    return (
      <UserProvider user={user || {
        id: 'loading',
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isCustomer: false,
        username: 'loading',
        email: 'loading@example.com'
      }}>
        <SidebarLayout>
          <div className="min-h-screen p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your cart...</p>
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  if (error) {
    return (
      <UserProvider user={user || {
        id: 'error',
        isAdmin: false,
        isRider: false,
        isModerator: false,
        isCustomer: false,
        username: 'error',
        email: 'error@example.com'
      }}>
        <SidebarLayout>
          <div className="min-h-screen p-8 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              {error === "Please login to view your cart" ? (
                <Button 
                  onClick={() => navigate("/login")} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go to Login
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </SidebarLayout>
      </UserProvider>
    );
  }

  // Ensure user is not null before passing to UserProvider
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
        <div className="min-h-screen p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="flex items-center text-2xl font-bold text-gray-900">
                <ShoppingCart className="mr-2 h-6 w-6" />
                Shopping Cart ({cartItems.length} items)
              </h1>
              {cartItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Continue Shopping
                </Button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="rounded-lg border bg-white p-12 text-center">
                <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Add some products to get started!</p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column: Cart Items */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-lg border shadow-sm p-4">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-500">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={allItemsSelected}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          className="h-4 w-4"
                        />
                        <span className="text-gray-900">Item Details</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-20 text-center">Qty</span>
                        <span className="w-20 text-right">Subtotal</span>
                        <span className="w-10 text-right">Remove</span>
                      </div>
                    </div>
                  </div>

                  {Object.entries(groupedItems).map(([shopName, items]) => {
                    const allSelected = items.every((item) => item.selected);
                    return (
                      <div key={shopName} className="bg-white rounded-lg border shadow-sm">
                        <div className="p-4 flex items-center justify-between bg-gray-50 border-b">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => handleSelectShop(shopName, Boolean(checked))}
                              className="h-4 w-4"
                            />
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-base text-blue-600">
                              {shopName}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          {items.map((item) => (
                            <div key={item.id} className="py-4 border-b last:border-b-0">
                              <CartItem
                                id={item.id}
                                name={item.name}
                                color={item.color}
                                price={item.price}
                                quantity={item.quantity}
                                image={item.image}
                                shop_name={item.shop_name}
                                selected={item.selected}
                                onUpdateQuantity={updateQuantity}
                                onRemove={removeItem}
                                onSelect={handleSelectItem}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Sidebar: Coupon & Order Summary */}
                <div className="space-y-6">
                  <ProfessionalCouponSection onApplyCoupon={handleApplyCoupon} />
                  <OrderSummary
                    subtotal={subtotal}
                    discount={discount}
                    delivery={delivery}
                    tax={tax}
                    onProceedToCheckout={handleCheckout}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </UserProvider>
  );
}