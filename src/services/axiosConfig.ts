import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let isConnected: boolean = true;

NetInfo.addEventListener(state => {
  // Handle the null case explicitly
  isConnected = state.isConnected === null ? false : state.isConnected;
});

const instance = axios.create({
  baseURL: 'https://locumbackenduat-ewcbfyghbvb2h0ez.centralindia-01.azurewebsites.net',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': `HealTrack/${Platform.OS}`,
  },
});

class NetworkError extends Error {
  isNetworkError: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
  }
}

instance.interceptors.request.use(
  async config => {
    if (!isConnected) {
      throw new NetworkError('No internet connection');
    }

    // Fetch the single source of truth for authentication
    const authToken = await AsyncStorage.getItem('auth_token');

    // Set authorization header if the token exists
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  async response => {
    const newAccessToken = response.headers['newAccessToken'];
    
    if (newAccessToken) {
      // Update AsyncStorage directly when the server rotates the token
      await AsyncStorage.setItem('auth_token', newAccessToken);
    }
    
    return response;
  },
  async error => {
    if (
      error.message === 'Network Error' ||
      !error.response ||
      (error instanceof NetworkError && error.isNetworkError)
    ) {
      console.error('Network error occurred:', error);
      return Promise.reject(new NetworkError('No internet connection'));
    }

    if (
      error.config &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      const originalRequest = error.config;
      try {
        // Fetch the active auth_token for the retry attempt
        const newToken = await AsyncStorage.getItem('auth_token');
        
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          // Use the custom 'instance' to ensure interceptors apply to the retry
          return instance(originalRequest); 
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;