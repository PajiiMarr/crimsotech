import axios from 'axios';

// Make sure this is your actual Django server URL
// const API_BASE_URL = 'http://192.168.254.108:8000/api'; // Change to your actual IP
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
// const API_BASE_URL = 'https://68ad01eeeaad.ngrok-free.app/api'; 

console.log('Axios configured with baseURL:', API_BASE_URL);

const AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const truncateString = (value: string, maxLength = 300) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}... [truncated]`;
};

const sanitizeErrorData = (data: unknown) => {
  if (typeof data === 'string') {
    return truncateString(data);
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    try {
      return JSON.parse(truncateString(JSON.stringify(data), 800));
    } catch {
      return '[unserializable error payload]';
    }
  }

  return data;
};

const hasNoCategoriesMessage = (data: unknown) => {
  if (typeof data === 'string') {
    return data.toLowerCase().includes('no categories found in database');
  }

  if (data && typeof data === 'object') {
    try {
      const raw = JSON.stringify(data).toLowerCase();
      return raw.includes('no categories found in database');
    } catch {
      return false;
    }
  }

  return false;
};

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
    const endpoint = error.config?.url || '';
    const status = error.response?.status;
    const responseData = error.response?.data;
    const isNoCategoriesError = hasNoCategoriesMessage(responseData);
    const isClassesUnavailable = endpoint.includes('/classes/') && status === 500 && isNoCategoriesError;
    const isPredictUnavailable = endpoint.includes('/predict/') && status === 500 && isNoCategoriesError;

    if (isClassesUnavailable) {
      return Promise.reject(error);
    }

    if (isPredictUnavailable) {
      return Promise.reject(error);
    }

    console.error('📥 Response Error:', {
      message: error.message,
      status,
      data: sanitizeErrorData(error.response?.data),
      url: error.config?.baseURL + error.config?.url,
    });

    return Promise.reject(error);
  }
);

export default AxiosInstance;