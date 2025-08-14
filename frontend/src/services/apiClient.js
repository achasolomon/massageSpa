import axios from 'axios';

// Get the backend API URL from environment variables or use a default
// In development, this might point to localhost:5001 (or whatever port the backend runs on)
// In production, this will point to the deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
//const API_BASE_URL = 'https://spa-api.algosoftwarelabs.com/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptor to add JWT token to requests ---
apiClient.interceptors.request.use(
  (config) => {
    // Retrieve the token from local storage (or session storage/memory)
    const token = localStorage.getItem('authToken'); 
    if (token) {
      config.headers['Authorization'] = `${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Interceptor to handle responses ---
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {

      console.error('API Error Response:', error.response.data);
      console.error('Status Code:', error.response.status);
      
      // Example: Handle 401 Unauthorized (e.g., token expired)
      if (error.response.status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('authToken');
        // Use window.location or react-router history to redirect
        // window.location.href = '/login'; 
        console.error('Unauthorized access - redirecting to login might be needed.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

