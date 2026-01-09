// Centralized API configuration
// Update this file to change the backend URL for all API calls

// For Android emulator, use: 'http://10.0.2.2:8000'
// For iOS simulator, use: 'http://localhost:8000'
// For real device on same network, use your computer's IP address
// Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)

export const API_CONFIG = {
  // Change this to your current IP address or use the appropriate value for your platform
  BASE_URL: 'http://192.168.1.27:8000', // Real device - your computer's IP

  // Platform-specific URLs (uncomment the one you need)
  // ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  // IOS_SIMULATOR: 'http://localhost:8000',
  // REAL_DEVICE: 'http://192.168.254.102:8000', // Your computer's IP
};

