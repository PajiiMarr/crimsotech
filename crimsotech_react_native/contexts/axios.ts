import axios from 'axios';

// Make sure this is your actual Django server URL
// const API_BASE_URL = 'http://192.168.254.108:8000/api'; // Change to your actual IP
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
// const API_BASE_URL = 'https://68ad01eeeaad.ngrok-free.app/api'; 

console.log('Axios configured with baseURL:', API_BASE_URL);

const AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor for debugging
AxiosInstance.interceptors.request.use(
  (config) => {
    console.log('📤 Request:', {
      method: config.method?.toUpperCase(),
      url: (config.baseURL || '') + config.url,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging - FILTER OUT CART MAX QUANTITY ERRORS
AxiosInstance.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    // Check if this is a "max quantity reached" error from cart endpoint
    const isCartMaxQuantityError = 
      error.config?.url?.includes('/view-cart/') &&
      error.response?.status === 400 &&
      error.response?.data?.error &&
      (error.response?.data?.error.includes('Only') || 
       error.response?.data?.error.includes('available'));

    // Don't log these expected errors - just show as warning instead
    if (isCartMaxQuantityError) {
      console.warn('📢 Max quantity reached:', error.response?.data?.error);
    } else {
      console.error('📥 Response Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.baseURL + error.config?.url,
      });
    }
    
    return Promise.reject(error);
  }
);

export default AxiosInstance;