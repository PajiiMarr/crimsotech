// utils/riderApi.ts
import axios from 'axios';
import AxiosInstance from '../contexts/axios';

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

const getUserHeaders = (userId: string) => ({
  headers: {
    'X-User-Id': userId,
  },
});

const handleAxiosError = (error: any, fallbackMessage: string) => {
  if (axios.isAxiosError(error)) {
    const data: any = error.response?.data;
    throw new Error(data?.error || data?.message || fallbackMessage);
  }
  throw error;
};

/**
 * Get rider dashboard data including metrics and active deliveries
 */
export const getRiderDashboard = async (userId: string, startDate?: string, endDate?: string) => {
  try {
    const response = await AxiosInstance.get('/rider-dashboard/rider_dashboard/', {
      ...getUserHeaders(userId),
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Get rider dashboard error:', error);
    handleAxiosError(error, 'Failed to get dashboard data');
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
    const response = await AxiosInstance.get('/rider-history/order_history/', {
      ...getUserHeaders(userId),
      params: {
        start_date: filters?.startDate,
        end_date: filters?.endDate,
        status: filters?.status,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Get rider order history error:', error);
    handleAxiosError(error, 'Failed to get order history');
  }
};

/**
 * Get rider schedule data
 */
export const getRiderSchedule = async (userId: string) => {
  try {
    const response = await AxiosInstance.get('/rider-schedule/get_schedule_data/', {
      ...getUserHeaders(userId),
    });

    return response.data;
  } catch (error: any) {
    console.error('Get rider schedule error:', error);
    handleAxiosError(error, 'Failed to get schedule data');
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
    const response = await AxiosInstance.post(
      '/rider-status/update_status/',
      {
        is_accepting_deliveries: isAccepting,
        availability_status: status || (isAccepting ? 'available' : 'offline'),
      },
      getUserHeaders(userId)
    );

    return response.data;
  } catch (error: any) {
    console.error('Update rider availability error:', error);
    handleAxiosError(error, 'Failed to update availability');
  }
};

/**
 * Get rider status
 */
export const getRiderStatus = async (userId: string) => {
  try {
    const response = await AxiosInstance.get('/rider-status/get_rider_status/', {
      ...getUserHeaders(userId),
    });

    return response.data;
  } catch (error: any) {
    console.error('Get rider status error:', error);
    handleAxiosError(error, 'Failed to get rider status');
  }
};

/**
 * Accept a delivery order
 */
export const acceptDeliveryOrder = async (userId: string, orderId: string) => {
  try {
    const response = await AxiosInstance.post(
      '/rider-orders-active/accept_order/',
      { order_id: orderId },
      getUserHeaders(userId)
    );

    return response.data;
  } catch (error: any) {
    console.error('Accept delivery order error:', error);
    handleAxiosError(error, 'Failed to accept order');
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
    const response = await AxiosInstance.post(
      '/rider-orders-active/update_delivery_status/',
      {
        delivery_id: deliveryId,
        status,
      },
      getUserHeaders(userId)
    );

    return response.data;
  } catch (error: any) {
    console.error('Update delivery status error:', error);
    handleAxiosError(error, 'Failed to update delivery status');
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (userId: string, orderId: string) => {
  try {
    const response = await AxiosInstance.get(`/rider-orders-active/order-details/${orderId}/`, {
      ...getUserHeaders(userId),
    });

    return response.data;
  } catch (error: any) {
    console.error('Get order details error:', error);
    handleAxiosError(error, 'Failed to get order details');
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
    const response = await AxiosInstance.get('/rider-history/export_history/', {
      ...getUserHeaders(userId),
      params: {
        format,
        start_date: filters?.startDate,
        end_date: filters?.endDate,
      },
      responseType: format === 'csv' ? 'arraybuffer' : 'json',
    });

    return response.data;
  } catch (error: any) {
    console.error('Export order history error:', error);
    handleAxiosError(error, 'Failed to export history');
  }
};
