// utils/api.ts
import { API_CONFIG } from './config';

const BASE_URL = API_CONFIG.BASE_URL;

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  password: string;
  email?: string;
}

interface LoginResponse {
  message: string;
  user_id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_customer: boolean;
  is_rider: boolean;
  is_moderator: boolean;
  registration_stage: number;
}

interface RegisterResponse {
  user_id: string;
  username: string;
  email: string;
  registration_stage: number;
  message: string;
}

// Login function that connects to the Django backend
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    console.log('Logging in with credentials:', credentials); // Debug log
    console.log('Connecting to:', `${BASE_URL}/api/login/`); // Debug log
    const response = await fetch(`${BASE_URL}/api/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Login response:', data); // Debug log
    console.log('Login response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Login API error:', data);
      throw new Error(data.error || data.detail || 'Login failed');
    }

    return data;
  } catch (error: any) {
    console.error('Login error:', error);
    // Better error handling for network failures
    if (error.message === 'Network request failed' || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check:\n1. Backend is running on port 8000\n2. Your IP address is correct in utils/config.ts\n3. Both devices are on the same network\n4. Firewall is not blocking port 8000');
    }
    throw error;
  }
};

  // Voucher API Functions
  export const getShopVouchers = async (shopId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/shop-vouchers/list_vouchers/?shop_id=${shopId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Get shop vouchers API error:', data);
        throw new Error(data.error || 'Failed to get vouchers');
      }

      return data;
    } catch (error: any) {
      console.error('Get shop vouchers error:', error);
      if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  export const createVoucher = async (voucherData: {
    shop_id: string;
    customer_id: string;
    name: string;
    code: string;
    discount_type: string;
    value: number;
    minimum_spend: number;
    maximum_usage: number;
    valid_until: string;
    is_active?: boolean;
  }) => {
    try {
      const response = await fetch(`${BASE_URL}/api/shop-vouchers/create_voucher/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voucherData),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Create voucher API error:', data);
        throw new Error(data.error || 'Failed to create voucher');
      }

      return data;
    } catch (error: any) {
      console.error('Create voucher error:', error);
      if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  export const updateVoucher = async (voucherData: {
    voucher_id: string;
    name?: string;
    discount_type?: string;
    value?: number;
    minimum_spend?: number;
    maximum_usage?: number;
    valid_until?: string;
    is_active?: boolean;
  }) => {
    try {
      const response = await fetch(`${BASE_URL}/api/shop-vouchers/update_voucher/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voucherData),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Update voucher API error:', data);
        throw new Error(data.error || 'Failed to update voucher');
      }

      return data;
    } catch (error: any) {
      console.error('Update voucher error:', error);
      if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  export const deleteVoucher = async (voucherId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/shop-vouchers/delete_voucher/?voucher_id=${voucherId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Delete voucher API error:', data);
        throw new Error(data.error || 'Failed to delete voucher');
      }

      return data;
    } catch (error: any) {
      console.error('Delete voucher error:', error);
      if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  export const validateVoucher = async (code: string, shopId: string, amount: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/shop-vouchers/validate_voucher/?code=${encodeURIComponent(code)}&shop_id=${shopId}&amount=${amount}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Validate voucher API error:', data);
        throw new Error(data.error || 'Failed to validate voucher');
      }

      return data;
    } catch (error: any) {
      console.error('Validate voucher error:', error);
      if (error.message === 'Network request failed' || error.message?.includes('Network')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw error;
    }
  };

// Register function that connects to the Django backend
export const register = async (userData: RegisterData): Promise<RegisterResponse> => {
  try {
    console.log('Registering with data:', userData); // Debug log
    console.log('Connecting to:', `${BASE_URL}/api/register/`); // Debug log
    const response = await fetch(`${BASE_URL}/api/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Registration response:', data); // Debug log
    console.log('Registration response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Registration API error:', data);
      // Return the error data so the calling function can handle specific validation errors
      const error = new Error('Registration failed');
      (error as any).response = data;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Registration error:', error);
    // Better error handling for network failures
    if (error.message === 'Network request failed' || 
        error.message?.includes('Network') || 
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please check:\n1. Backend is running on port 8000\n2. Your IP address is correct in utils/config.ts\n3. Both devices are on the same network\n4. Firewall is not blocking port 8000');
    }
    throw error;
  }
};

// Get user shops
export const getUserShops = async (customerId: string): Promise<any> => {
  try {
    console.log('Fetching shops for customer:', customerId);
    const response = await fetch(`${BASE_URL}/api/customer-shops/?customer_id=${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Get shops response:', data);
    console.log('Get shops response status:', response.status);

    if (!response.ok) {
      console.error('Get shops API error:', data);
      throw new Error(data.error || 'Failed to fetch shops');
    }

    return data;
  } catch (error: any) {
    console.error('Get shops error:', error);
    if (error.message === 'Network request failed' || 
        error.message?.includes('Network') || 
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Get a single shop by ID (for viewing any shop)
export const getShopById = async (shopId: string): Promise<any> => {
  try {
    console.log('Fetching shop with ID:', shopId);
    const response = await fetch(`${BASE_URL}/api/customer-shops/?shop_id=${shopId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Get shop by ID response:', data);
    console.log('Get shop by ID response status:', response.status);

    if (!response.ok) {
      console.error('Get shop by ID API error:', data);
      throw new Error(data.error || 'Failed to fetch shop');
    }

    return data;
  } catch (error: any) {
    console.error('Get shop by ID error:', error);
    if (error.message === 'Network request failed' || 
        error.message?.includes('Network') || 
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Get all products
export const getAllProducts = async (): Promise<any> => {
  try {
    console.log('Fetching all products');
    const response = await fetch(`${BASE_URL}/api/public-products/`, { // Public products endpoint
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Get all products response:', data);
    console.log('Get all products response status:', response.status);

    if (!response.ok) {
      console.error('Get all products API error:', data);
      throw new Error(data.error || 'Failed to fetch products');
    }

    return data;
  } catch (error: any) {
    console.error('Get all products error:', error);
    if (error.message === 'Network request failed' ||
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Get products by shop
export const getShopProducts = async (shopId: string, page: number = 1, pageSize: number = 12): Promise<any> => {
  try {
    console.log('Fetching products for shop:', shopId, 'page:', page);
    const response = await fetch(`${BASE_URL}/api/public-products/?shop_id=${shopId}&page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Get shop products response:', Array.isArray(data) ? { length: data.length } : data);
    console.log('Get shop products response status:', response.status);

    if (!response.ok) {
      console.error('Get shop products API error:', data);
      throw new Error(data.error || 'Failed to fetch shop products');
    }

    return data;
  } catch (error: any) {
    console.error('Get shop products error:', error);
    if (error.message === 'Network request failed' || 
        error.message?.includes('Network') || 
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Get seller products (shop-linked) for a given customer
export const getSellerProducts = async (customerId: string): Promise<any> => {
  try {
    console.log('Fetching seller products for customer:', customerId);
    const response = await fetch(`${BASE_URL}/api/seller-products/?customer_id=${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Get seller products response:', data);
    console.log('Get seller products response status:', response.status);

    if (!response.ok) {
      console.error('Get seller products API error:', data);
      throw new Error(data.error || 'Failed to fetch seller products');
    }

    return data;
  } catch (error: any) {
    console.error('Get seller products error:', error);
    if (error.message === 'Network request failed' ||
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Create shop function
export const createShop = async (shopData: FormData): Promise<any> => {
  try {
    console.log('Creating shop with data:', shopData);
    const response = await fetch(`${BASE_URL}/api/customer-shops/`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
        // The user_id might be extracted from the authentication token
      },
      body: shopData,
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Server returned invalid response (Status: ${response.status})`);
    }

    console.log('Create shop response:', data);
    console.log('Create shop response status:', response.status);

    if (!response.ok) {
      console.error('Create shop API error:', data);
      const error = new Error(data.error || 'Failed to create shop');
      (error as any).response = data;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Create shop error:', error);
    if (error.message === 'Network request failed' || 
        error.message?.includes('Network') || 
        error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Update user profile function
export const updateProfile = async (userId: string, profileData: any): Promise<any> => {
  try {
    console.log('Updating profile for user:', userId, 'with data:', profileData); // Debug log
    const response = await fetch(`${BASE_URL}/api/register/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId, // Backend expects user ID in header
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    console.log('Profile update response:', data); // Debug log
    console.log('Profile update response status:', response.status); // Debug log

    if (!response.ok) {
      console.error('Profile update API error:', data);
      // Return the error data so the calling function can handle specific errors
      const error = new Error('Profile update failed');
      (error as any).response = data;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Profile update error:', error);
    // Better error handling for network failures
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check:\n1. Backend is running on port 8000\n2. Your IP address is correct\n3. Both devices are on the same network');
    }
    throw error;
  }
};

// Register user as customer function
export const registerUserAsCustomer = async (userId: string): Promise<any> => {
  try {
    console.log('Registering user as customer:', userId);
    const response = await fetch(`${BASE_URL}/api/register/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId, // Backend expects user ID in header
      },
      body: JSON.stringify({
        is_customer: true
      }),
    });

    const data = await response.json();
    console.log('Register user as customer response:', data);
    console.log('Register user as customer response status:', response.status);

    if (!response.ok) {
      console.error('Register user as customer API error:', data);
      const error = new Error('Register user as customer failed');
      (error as any).response = data;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Register user as customer error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Favorites API functions
export const getFavorites = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/favorites/list_favorites/?customer_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Get favorites API error:', data);
      throw new Error(data.error || 'Failed to get favorites');
    }

    return data;
  } catch (error: any) {
    console.error('Get favorites error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

export const addFavorite = async (userId: string, productId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/favorites/add_favorite/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: userId,
        product_id: productId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Add favorite API error:', data);
      throw new Error(data.error || 'Failed to add favorite');
    }

    return data;
  } catch (error: any) {
    console.error('Add favorite error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

export const removeFavorite = async (userId: string, productId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/favorites/remove_favorite/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: userId,
        product_id: productId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Remove favorite API error:', data);
      throw new Error(data.error || 'Failed to remove favorite');
    }

    return data;
  } catch (error: any) {
    console.error('Remove favorite error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

export const checkFavorite = async (userId: string, productId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/favorites/check_favorite/?customer_id=${userId}&product_id=${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Check favorite API error:', data);
      throw new Error(data.error || 'Failed to check favorite');
    }

    return data;
  } catch (error: any) {
    console.error('Check favorite error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Review API Functions
export const submitReview = async (reviewData: {
  customer_id: string;
  product_id: string;
  order_id: string;
  checkout_id?: string;
  rating: number;
  comment?: string;
}) => {
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/submit-review/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Submit review API error:', data);
      throw new Error(data.error || 'Failed to submit review');
    }

    return data;
  } catch (error: any) {
    console.error('Submit review error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

export const getProductReviews = async (productId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/product-reviews/?product_id=${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Get product reviews API error:', data);
      throw new Error(data.error || 'Failed to get reviews');
    }

    return data;
  } catch (error: any) {
    console.error('Get product reviews error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

export const getPendingReviews = async (customerId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/api/reviews/pending-reviews/?customer_id=${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Get pending reviews API error:', data);
      throw new Error(data.error || 'Failed to get pending reviews');
    }

    return data;
  } catch (error: any) {
    console.error('Get pending reviews error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};