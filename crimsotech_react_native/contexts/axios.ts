import axios from 'axios';

// Make sure this is your actual Django server URL
const API_BASE_URL = 'http://192.168.1.12:8000'; // Change to your actual IP

console.log('Axios configured with baseURL:', API_BASE_URL);

const AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
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
      url: config.baseURL + config.url,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
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
    console.error('📥 Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.baseURL + error.config?.url,
    });
    return Promise.reject(error);
  }
);

export default AxiosInstance;