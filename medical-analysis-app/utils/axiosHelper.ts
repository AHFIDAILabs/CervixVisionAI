import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token automatically if exists
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle refresh token flow
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const res: AxiosResponse<{ accessToken: string; refreshToken?: string }> = await axios.post(
          `${API_URL}/api/v1/auth/refresh`, // Updated to match backend
          { token: refreshToken }
        );

        if (res.data.accessToken) {
          await SecureStore.setItemAsync("accessToken", res.data.accessToken);
          if (res.data.refreshToken) {
            await SecureStore.setItemAsync("refreshToken", res.data.refreshToken);
          }

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${res.data.accessToken}`;

          return axiosInstance(originalRequest);
        } else {
          throw new Error("No access token in refresh response");
        }
      } catch (err) {
        console.error("Refresh token failed:", err);
        if (err instanceof AxiosError && err.response?.status === 404) {
          console.error("Refresh endpoint not found:", `${API_URL}/api/v1/auth/refresh`);
        }
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        // Notify AuthContext to update state (e.g., via a custom event or context update)
      }
    }
    return Promise.reject(error);
  }
);

// Generalized request wrapper
export const authRequest = async <T = any>(
  config: AxiosRequestConfig
): Promise<T> => {
  const response = await axiosInstance(config);
  return response.data;
};

export default axiosInstance;