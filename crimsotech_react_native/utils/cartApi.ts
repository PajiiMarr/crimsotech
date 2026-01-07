// utils/cartApi.ts

interface CartItem {
  id: string;
  product: any; // Product object
  user: string;
  quantity: number;
  added_at: string;
}

interface AddToCartData {
  user_id: string;
  product_id: string;
  quantity?: number;
}

interface CheckoutData {
  customer_id: string;
  product_id: string;
  quantity: number;
}

interface OrderItemResponse {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: string;
  total_amount: string;
}

interface OrderResponse {
  order_id: string;
  status: string;
  total_amount: string;
  payment_method: string;
  delivery_method: string;
  delivery_address: string;
  created_at: string;
  items: OrderItemResponse[];
}

// utils/cartApi.ts
import { API_CONFIG } from './config';

const BASE_URL = API_CONFIG.BASE_URL;

// Add item to cart
export const addToCart = async (cartData: AddToCartData): Promise<{ success: boolean; cart_item?: CartItem; error?: string }> => {
  try {
    console.log('Adding to cart with data:', cartData); // Debug log
    const response = await fetch(`${BASE_URL}/api/cart/add/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartData),
    });
    console.log('Add to cart URL:', `${BASE_URL}/api/cart/add/`);
    console.log('Add to cart response status:', response.status);
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => '');
      console.error('Add to cart non-JSON response:', text?.slice(0, 200));
      return { success: false, error: text || `Unexpected server response (status ${response.status})` };
    }
    console.log('Add to cart response:', data); // Debug log
    console.log('Add to cart response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Add to cart API error:', data);
      return { success: false, error: data.error || 'Failed to add item to cart' };
    }

    return data;
  } catch (error: any) {
    console.error('Add to cart error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
      return { success: false, error: 'Cannot connect to server. Please check your connection and backend status.' };
    }
    return { success: false, error: 'Network error - could not add item to cart' };
  }
};

// Get cart items for user
export const getCartItems = async (userId: string): Promise<{ success: boolean; cart_items?: CartItem[]; error?: string }> => {
  try {
    console.log('Getting cart items for user:', userId); // Debug log
    const response = await fetch(`${BASE_URL}/api/view-cart/?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Get cart URL:', `${BASE_URL}/api/view-cart/?user_id=${userId}`);
    console.log('Get cart response status pre-parse:', response.status);
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => '');
      console.error('Get cart items non-JSON response:', text?.slice(0, 200));
      return { success: false, error: text || 'Unexpected server response' };
    }
    console.log('Get cart items response:', data); // Debug log
    console.log('Get cart items response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Get cart items API error:', data);
      return { success: false, error: data.error || 'Failed to get cart items' };
    }

    return data;
  } catch (error) {
    console.error('Get cart items error:', error);
    return { success: false, error: 'Network error - could not get cart items' };
  }
};

// Checkout function
export const checkout = async (checkoutData: CheckoutData) => {
  try {
    console.log('Checking out with data:', checkoutData); // Debug log
    const response = await fetch(`${BASE_URL}/api/checkout/checkout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    const data = await response.json();
    console.log('Checkout response:', data); // Debug log
    console.log('Checkout response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Checkout API error:', data);
      throw new Error(data.error || 'Checkout failed');
    }

    return data;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Get orders for a user
export const getOrders = async (userId: string): Promise<{ success: boolean; orders?: OrderResponse[]; error?: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/checkout/orders/?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => '');
      return { success: false, error: text || 'Unexpected server response' };
    }

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch orders' };
    }

    return data;
  } catch (error) {
    console.error('Get orders error:', error);
    return { success: false, error: 'Network error - could not fetch orders' };
  }
};

// Update cart item quantity (SET, not ADD)
export const updateCartItem = async (userId: string, cartItemId: string, quantity: number): Promise<{ success: boolean; cart_item?: any; error?: string }> => {
  try {
    console.log('Updating cart item:', { userId, cartItemId, quantity });
    const response = await fetch(`${BASE_URL}/api/view-cart/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, cart_item_id: cartItemId, quantity }),
    });

    console.log('Update cart response status:', response.status);
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => '');
      console.error('Update cart non-JSON response:', text?.slice(0, 200));
      return { success: false, error: text || `Unexpected server response (status ${response.status})` };
    }

    console.log('Update cart response:', data);

    if (!response.ok) {
      console.error('Update cart API error:', data);
      return { success: false, error: data.error || 'Failed to update cart item' };
    }

    return data;
  } catch (error) {
    console.error('Update cart item error:', error);
    return { success: false, error: 'Network error - could not update cart item' };
  }
};

// Remove cart item
export const removeCartItem = async (userId: string, cartItemId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    console.log('Removing cart item:', { userId, cartItemId });
    const response = await fetch(`${BASE_URL}/api/view-cart/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, cart_item_id: cartItemId }),
    });

    console.log('Remove cart response status:', response.status);
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => '');
      console.error('Remove cart non-JSON response:', text?.slice(0, 200));
      return { success: false, error: text || `Unexpected server response (status ${response.status})` };
    }

    console.log('Remove cart response:', data);

    if (!response.ok) {
      console.error('Remove cart API error:', data);
      return { success: false, error: data.error || 'Failed to remove cart item' };
    }

    return data;
  } catch (error) {
    console.error('Remove cart item error:', error);
    return { success: false, error: 'Network error - could not remove cart item' };
  }
};

// ========== RIDER DELIVERY MANAGEMENT ==========

export const getRiderDeliveries = async (userId: string, status?: string): Promise<{ success: boolean; data: any[]; message?: string; error?: string }> => {
  try {
    console.log('Fetching rider deliveries:', { userId, status });
    const params = new URLSearchParams({ user_id: userId });
    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${BASE_URL}/api/rider-deliveries/my_deliveries/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Rider deliveries response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Rider deliveries API error:', data);
      return { success: false, data: [], error: data.message || 'Failed to fetch deliveries' };
    }

    return { success: true, data: data.data || [], message: data.message };
  } catch (error) {
    console.error('Rider deliveries error:', error);
    return { success: false, data: [], error: 'Network error - could not fetch deliveries' };
  }
};

export const updateDeliveryStatus = async (deliveryId: string, status: 'picked_up' | 'delivered', notes?: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> => {
  try {
    console.log('Updating delivery status:', { deliveryId, status });
    const response = await fetch(`${BASE_URL}/api/rider-deliveries/update_delivery_status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ delivery_id: deliveryId, status, notes }),
    });

    console.log('Update delivery status response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Update delivery status API error:', data);
      return { success: false, error: data.message || 'Failed to update delivery status' };
    }

    return { success: true, data: data.data, message: data.message };
  } catch (error) {
    console.error('Update delivery status error:', error);
    return { success: false, error: 'Network error - could not update delivery status' };
  }
};

// ========== SHOP ORDER MANAGEMENT ==========

export const getShopOrders = async (shopId: string, status?: string): Promise<{ success: boolean; data: any[]; count?: number; message?: string; error?: string }> => {
  try {
    console.log('Fetching shop orders:', { shopId, status });
    const params = new URLSearchParams({ shop_id: shopId });
    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${BASE_URL}/api/shop-order-management/shop_orders/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Shop orders response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Shop orders API error:', data);
      return { success: false, data: [], error: data.message || 'Failed to fetch orders' };
    }

    return { success: true, data: data.data || [], count: data.count, message: data.message };
  } catch (error) {
    console.error('Shop orders error:', error);
    return { success: false, data: [], error: 'Network error - could not fetch orders' };
  }
};

export const getAvailableRiders = async (): Promise<{ success: boolean; data: any[]; count?: number; message?: string; error?: string }> => {
  try {
    console.log('Fetching available riders');
    const response = await fetch(`${BASE_URL}/api/shop-order-management/available_riders/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Available riders response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Available riders API error:', data);
      return { success: false, data: [], error: data.message || 'Failed to fetch riders' };
    }

    return { success: true, data: data.data || [], count: data.count, message: data.message };
  } catch (error) {
    console.error('Available riders error:', error);
    return { success: false, data: [], error: 'Network error - could not fetch riders' };
  }
};

export const assignRiderToDelivery = async (deliveryId: string, riderId: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> => {
  try {
    console.log('Assigning rider to delivery:', { deliveryId, riderId });
    const response = await fetch(`${BASE_URL}/api/shop-order-management/assign_rider/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ delivery_id: deliveryId, rider_id: riderId }),
    });

    console.log('Assign rider response status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.error('Assign rider API error:', data);
      return { success: false, error: data.message || 'Failed to assign rider' };
    }

    return { success: true, data: data.data, message: data.message };
  } catch (error) {
    console.error('Assign rider error:', error);
    return { success: false, error: 'Network error - could not assign rider' };
  }
};

  export const refuseDelivery = async (deliveryId: string, userId: string, reason?: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> => {
    try {
      console.log('Refusing delivery:', { deliveryId, userId });
      const response = await fetch(`${BASE_URL}/api/rider-deliveries/refuse_delivery/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delivery_id: deliveryId, user_id: userId, reason }),
      });

      console.log('Refuse delivery response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error('Refuse delivery API error:', data);
        return { success: false, error: data.message || 'Failed to refuse delivery' };
      }

      return { success: true, data: data.data, message: data.message };
    } catch (error) {
      console.error('Refuse delivery error:', error);
      return { success: false, error: 'Network error - could not refuse delivery' };
    }
  };

  export const getAvailableDeliveries = async (): Promise<{ success: boolean; data: any[]; count?: number; message?: string; error?: string }> => {
    try {
      console.log('Fetching available deliveries');
      const response = await fetch(`${BASE_URL}/api/rider-deliveries/available_deliveries/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Available deliveries response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error('Available deliveries API error:', data);
        return { success: false, data: [], error: data.message || 'Failed to fetch available deliveries' };
      }

      return { success: true, data: data.data || [], count: data.count, message: data.message };
    } catch (error) {
      console.error('Available deliveries error:', error);
      return { success: false, data: [], error: 'Network error - could not fetch available deliveries' };
    }
  };

  export const acceptDelivery = async (deliveryId: string, userId: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> => {
    try {
      console.log('Accepting delivery:', { deliveryId, userId });
      const response = await fetch(`${BASE_URL}/api/rider-deliveries/accept_delivery/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delivery_id: deliveryId, user_id: userId }),
      });

      console.log('Accept delivery response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error('Accept delivery API error:', data);
        return { success: false, error: data.message || 'Failed to accept delivery' };
      }

      return { success: true, data: data.data, message: data.message };
    } catch (error) {
      console.error('Accept delivery error:', error);
      return { success: false, error: 'Network error - could not accept delivery' };
    }
  };