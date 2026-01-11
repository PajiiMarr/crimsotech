import { Platform } from 'react-native';

// Centralized API configuration
// Update BASE_URL below to point to your backend. For local development:
// - Android emulator: 'http://10.0.2.2:8000'
// - iOS simulator: 'http://localhost:8000'
// - Real device: use your computer IP, e.g. 'http://192.168.254.102:8000'

export const API_CONFIG = {
  BASE_URL:
    Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://localhost:8000',
  // Uncomment and replace if using a real device on your network:
  // BASE_URL: 'http://192.168.254.102:8000',
};

