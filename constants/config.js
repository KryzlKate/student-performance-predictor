import { Platform } from 'react-native';

const URLS = {
  development: {
    ios: 'http://192.168.1.9:5000',     
    android: 'http://192.168.1.9:5000',  
    simulator: 'http://localhost:5000',  
    emulator: 'http://10.0.2.2:5000',
    web: 'http://localhost:5000', // ADD THIS for web
  },
  production: {
    default: 'https://merry-comfort-production.up.railway.app', 
  }
};

const getEnvironment = () => {
  if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
    return 'production';
  }
  return __DEV__ ? 'development' : 'production';
};

export const getApiUrl = () => {
  const env = getEnvironment();
  
  if (env === 'production') {
    return URLS.production.default;
  }

  // Handle web platform
  if (Platform.OS === 'web') {
    return URLS.development.web;
  }

  // Handle iOS
  if (Platform.OS === 'ios') {
    // Simplified: For iOS, always use network IP
    return URLS.development.ios;
  }
  
  // Handle Android
  if (Platform.OS === 'android') {
    // If developing on Windows, likely using Android emulator
    return URLS.development.emulator; // Use 10.0.2.2 for Android emulator
  }
  
  // Default fallback
  return URLS.development.android; 
};

export const API_URL = getApiUrl();
export const IS_PRODUCTION = getEnvironment() === 'production';
export const IS_DEVELOPMENT = getEnvironment() === 'development';

if (IS_DEVELOPMENT) {
  console.log('🔧 Config:', {
    environment: getEnvironment(),
    platform: Platform.OS,
    apiUrl: API_URL,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'native',
  });
}

export default {
  getApiUrl,
  API_URL,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  getEnvironment,
};