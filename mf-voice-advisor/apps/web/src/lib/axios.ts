import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Crucial for sending/receiving httpOnly cookies
});

// We need a way to get the current access token. 
// Since axios is outside the React context, we'll store a reference to it.
let currentAccessToken: string | null = null;

export const setGlobalAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    if (currentAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token using the httpOnly cookie
        const refreshResponse = await axios.post(
          `${API_BASE}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        
        // Update the global reference
        setGlobalAccessToken(newAccessToken);
        
        // Update the failed request's header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails (e.g., token revoked or expired), force logout
        // The AuthContext will handle state, but we clear the global token
        setGlobalAccessToken(null);
        // Optionally dispatch a custom event to tell AuthContext to log out
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
