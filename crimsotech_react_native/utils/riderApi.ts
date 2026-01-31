// utils/riderApi.ts
import { API_CONFIG } from './config';

const BASE_URL = API_CONFIG.BASE_URL;

// Type definitions for Rider API responses
export interface RiderDashboardMetrics {
  total_deliveries: number;
  delivered: number;
  pending: number;
  cancelled: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  active_deliveries: number;
  on_time_percentage: number;
}

export interface DeliveryItem {
  id: string;
  order_id: string;
  status: string;
  distance_km?: number;
  estimated_minutes?: number;
  order: {
    total_amount: number;
    delivery_address_text?: string;
    user: {
      first_name: string;
      last_name: string;
    };
  };
  scheduled_delivery_time?: string;
  picked_at?: string;
  delivered_at?: string;
}

export interface RiderData {
  id: string;
  vehicle_type: string;
  plate_number: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_image?: string;
  verified: boolean;
  availability_status: string;
  is_accepting_deliveries: boolean;
}

export interface OrderHistoryMetrics {
  total_deliveries: number;
  delivered_count: number;
  cancelled_count: number;
  total_earnings: number;
  avg_delivery_time: number;
  avg_rating: number;
  on_time_percentage: number;
  today_deliveries: number;
  week_earnings: number;
  has_data: boolean;
}

export interface ScheduleMetrics {
  total_deliveries: number;
  upcoming_deliveries: number;
  in_progress_deliveries: number;
  completed_deliveries: number;
  avg_delivery_time: number;
  total_distance_km: number;
  average_rating: number;
  today_deliveries: number;
  peak_day: string;
  availability_percentage: number;
  avg_deliveries_per_day: number;
  has_data: boolean;
}

/**
 * Get rider dashboard data including metrics and active deliveries
 */
export const getRiderDashboard = async (userId: string, startDate?: string, endDate?: string) => {
  try {
    let url = `${BASE_URL}/api/rider-dashboard/rider_dashboard/`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Get rider dashboard API error:', data);
      throw new Error(data.error || 'Failed to get dashboard data');
    }

    return data;
  } catch (error: any) {
    console.error('Get rider dashboard error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Get rider order history with optional filters
 */
export const getRiderOrderHistory = async (
  userId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: 'all' | 'completed' | 'active' | 'pending' | 'delivered' | 'cancelled';
  }
) => {
  try {
    let url = `${BASE_URL}/api/rider-history/order_history/`;
    
    // Add query parameters
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Get rider order history API error:', data);
      throw new Error(data.error || 'Failed to get order history');
    }

    return data;
  } catch (error: any) {
    console.error('Get rider order history error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Get rider schedule data
 */
export const getRiderSchedule = async (userId: string) => {
  try {
    const url = `${BASE_URL}/api/rider-schedule/get_schedule_data/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Get rider schedule API error:', data);
      throw new Error(data.error || 'Failed to get schedule data');
    }

    return data;
  } catch (error: any) {
    console.error('Get rider schedule error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Get active orders for rider (pending and to deliver)
 */
export const getRiderActiveOrders = async (userId: string) => {
  try {
    // This would use the rider dashboard endpoint but filtered for active orders
    const dashboardData = await getRiderDashboard(userId);
    
    // Filter active deliveries
    const activeDeliveries = dashboardData.deliveries?.filter(
      (delivery: DeliveryItem) => 
        delivery.status === 'pending' || 
        delivery.status === 'picked_up' || 
        delivery.status === 'in_progress'
    ) || [];

    return {
      success: true,
      deliveries: activeDeliveries,
      count: activeDeliveries.length,
    };
  } catch (error: any) {
    console.error('Get rider active orders error:', error);
    throw error;
  }
};

/**
 * Update rider availability status
 */
export const updateRiderAvailability = async (
  userId: string,
  isAccepting: boolean,
  status?: 'available' | 'busy' | 'break' | 'offline' | 'unavailable'
) => {
  try {
    const url = `${BASE_URL}/api/rider-status/update_status/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        is_accepting_deliveries: isAccepting,
        availability_status: status || (isAccepting ? 'available' : 'offline'),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Update rider availability API error:', data);
      throw new Error(data.error || 'Failed to update availability');
    }

    return data;
  } catch (error: any) {
    console.error('Update rider availability error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Get rider status
 */
export const getRiderStatus = async (userId: string) => {
  try {
    const url = `${BASE_URL}/api/rider-status/get_rider_status/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Get rider status API error:', data);
      throw new Error(data.error || 'Failed to get rider status');
    }

    return data;
  } catch (error: any) {
    console.error('Get rider status error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Accept a delivery order
 */
export const acceptDeliveryOrder = async (userId: string, orderId: string) => {
  try {
    const url = `${BASE_URL}/api/rider-orders-active/accept_order/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Accept delivery order API error:', data);
      throw new Error(data.error || 'Failed to accept order');
    }

    return data;
  } catch (error: any) {
    console.error('Accept delivery order error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Update delivery status (picked up, in progress, delivered)
 */
export const updateDeliveryStatus = async (
  userId: string,
  deliveryId: string,
  status: 'picked_up' | 'in_progress' | 'delivered' | 'cancelled'
) => {
  try {
    const url = `${BASE_URL}/api/rider-orders-active/update_delivery_status/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        delivery_id: deliveryId,
        status: status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Update delivery status API error:', data);
      throw new Error(data.error || 'Failed to update delivery status');
    }

    return data;
  } catch (error: any) {
    console.error('Update delivery status error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (userId: string, orderId: string) => {
  try {
    const url = `${BASE_URL}/api/rider-orders-active/order-details/${orderId}/`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Get order details API error:', data);
      throw new Error(data.error || 'Failed to get order details');
    }

    return data;
  } catch (error: any) {
    console.error('Get order details error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Export order history (for earnings download)
 */
export const exportOrderHistory = async (
  userId: string,
  format: 'json' | 'csv' = 'json',
  filters?: {
    startDate?: string;
    endDate?: string;
  }
) => {
  try {
    let url = `${BASE_URL}/api/rider-history/export_history/`;
    
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    
    url += `?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    if (format === 'csv') {
      // Return blob for CSV
      const blob = await response.blob();
      return blob;
    } else {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to export history');
      }
      return data;
    }
  } catch (error: any) {
    console.error('Export order history error:', error);
    if (error.message === 'Network request failed' || error.message?.includes('Network')) {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};
