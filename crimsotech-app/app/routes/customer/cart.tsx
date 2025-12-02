// cart.tsx - COMPLETE CODE WITH DYNAMIC DATA HANDLING
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
  selected: boolean;
  added_at?: string;
  subtotal?: number;
};

type ApiCartItem = {
  id: string;
  product: string; // product ID
  product_details: {
    id: string;
    name: string;
    price: string;
    shop_name: string;
    media_files: null | Array<{
      file_url: string;
      file_type: string;
    }>;
  };
  item_name: string;
  item_price: string;
  item_image: null | string;
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

// ------------------ TRANSFORM API DATA ------------------
const transformApiData = (apiItems: ApiCartItem[]): CartItemType[] => {
  return apiItems.map((item) => {
    // Use product_details if available, otherwise use direct fields
    const productName = item.product_details?.name || item.item_name || "Unknown Product";
    const productPrice = item.product_details?.price || item.item_price || "0";
    const shopName = item.product_details?.shop_name || "Unknown Shop";
    
    // Convert price to number
    const price = parseFloat(productPrice) || 0;
    
    // Get image - try in this order:
    // 1. item_image from API
    // 2. media_files from product_details
    // 3. default image
    let image: string | null = null;
    
    if (item.item_image) {
      image = item.item_image;
    } else if (item.product_details?.media_files && 
               item.product_details.media_files.length > 0 &&
               item.product_details.media_files[0]?.file_url) {
      image = item.product_details.media_files[0].file_url;
    }
    
    // Calculate subtotal if not provided
    const subtotal = item.subtotal || (price * item.quantity);
    
    return {
      id: item.id,
      product_id: item.product || item.product_details?.id || item.id,
      name: productName,
      price: price,
      quantity: item.quantity || 1,
      image: image,
      shop_name: shopName,
      selected: true, // Default all items to selected
      added_at: item.added_at,
      subtotal: subtotal,
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
        
        console.log("Fetching cart for user ID:", userId);
        
        const response = await AxiosInstance.get<CartApiResponse>("/view-cart/", {
          params: { user_id: userId }
        });
        
        console.log("Cart API Response:", response.data);
        
        if (response.data.success) {
          if (Array.isArray(response.data.cart_items) && response.data.cart_items.length > 0) {
            // Transform API data to CartItemType
            const transformedItems = transformApiData(response.data.cart_items);
            console.log("Transformed cart items:", transformedItems);
            setCartItems(transformedItems);
          } else {
            // Empty cart
            setCartItems([]);
            setError(null);
          }
        } else {
          setError(response.data.error || "Failed to load cart");
        }
      } catch (err: any) {
        console.error("Failed to fetch cart items:", err);
        
        // Handle different error scenarios
        if (err.response?.status === 400) {
          setError("User ID is required or invalid");
        } else if (err.response?.status === 404) {
          setError("User not found");
        } else if (err.code === 'ERR_NETWORK') {
          setError("Network error. Please check your connection.");
        } else if (err.response?.status === 401) {
          setError("Please login to view your cart");
        } else {
          setError(err.response?.data?.error || "Failed to load cart items. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId]);

  // ------------------ ITEM HANDLERS ------------------
  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }

    try {
      const response = await AxiosInstance.put(`/view-cart/items/${id}/update/`, { 
        user_id: userId,
        quantity 
      });
      
      if (response.data.success) {
        setCartItems((items) => 
          items.map((item) => {
            if (item.id === id) {
              const updatedItem = { 
                ...item, 
                quantity,
                subtotal: item.price * quantity
              };
              return updatedItem;
            }
            return item;
          })
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

  // ------------------ GROUP ITEMS BY SHOP ------------------
  const groupedItems = cartItems.reduce<Record<string, CartItemType[]>>((acc, item) => {
    if (!acc[item.shop_name]) {
      acc[item.shop_name] = [];
    }
    acc[item.shop_name].push(item);
    return acc;
  }, {});

  const allItemsSelected = cartItems.length > 0 && cartItems.every((item) => item.selected);
  
  const handleSelectAll = (checked: boolean) => {
    setCartItems((items) => 
      items.map((item) => ({ ...item, selected: checked }))
    );
  };

  // ------------------ ORDER SUMMARY CALCULATIONS ------------------
  const selectedItems = cartItems.filter((item) => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const discount = 0; // Will be updated when coupons are implemented
  const delivery = selectedItems.length > 0 ? 50.00 : 0;
  const taxRate = 0.05;
  const tax = subtotal * taxRate;
  const total = subtotal - discount + delivery + tax;

  // ------------------ NAVIGATE TO CHECKOUT ------------------
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to proceed.");
      return;
    }
    
    // Create checkout data
    const checkoutData = {
      user_id: userId,
      items: selectedItems.map(item => ({
        cart_item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      })),
      total_amount: total
    };
    
    console.log("Proceeding to checkout with:", checkoutData);
    
    // Navigate to checkout with selected items
    const selectedIds = selectedItems.map((item) => item.id).join(",");
    navigate(`/checkout/?items=${selectedIds}`);
  };

  // ------------------ COUPON HANDLER ------------------
  const handleApplyCoupon = (code: string) => {
    console.log("Applying coupon:", code);
    // TODO: Implement coupon validation and application
    // This would call your Django API to validate and apply the coupon
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
              <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-red-600 mb-4 font-medium">{error}</p>
              {error.includes("login") || error.includes("Login") ? (
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate("/login")} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Login
                  </Button>
                  <Button 
                    onClick={() => navigate("/")} 
                    variant="outline"
                    className="ml-3"
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Retry
                  </Button>
                  <Button 
                    onClick={() => navigate("/")} 
                    variant="outline"
                    className="ml-3"
                  >
                    Continue Shopping
                  </Button>
                </div>
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
                Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
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
                        <span className="w-20 text-center">Quantity</span>
                        <span className="w-20 text-right">Subtotal</span>
                        <span className="w-10 text-right">Remove</span>
                      </div>
                    </div>
                  </div>

                  {Object.entries(groupedItems).map(([shopName, items]) => {
                    const allShopItemsSelected = items.every((item) => item.selected);
                    
                    return (
                      <div key={shopName} className="bg-white rounded-lg border shadow-sm">
                        <div className="p-4 flex items-center justify-between bg-gray-50 border-b">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allShopItemsSelected}
                              onCheckedChange={(checked) => handleSelectShop(shopName, Boolean(checked))}
                              className="h-4 w-4"
                            />
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="font-semibold text-base text-blue-600">
                              {shopName}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <div className="p-4">
                          {items.map((item, index) => (
                            <div key={item.id} className={`py-4 ${index !== items.length - 1 ? 'border-b' : ''}`}>
                              <CartItem
                                id={item.id}
                                name={item.name}
                                color="" // Your API doesn't provide color
                                price={item.price}
                                quantity={item.quantity}
                                image={item.image || "/public/default.jpg"}
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