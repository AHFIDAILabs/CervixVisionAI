import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

// AuthContext registers this on mount so the interceptor can trigger logout
// without creating a circular dependency.
let _onLogout: (() => void) | null = null;
export const setLogoutCallback = (fn: () => void) => { _onLogout = fn; };

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

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

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) throw new Error("No refresh token available");

        const res: AxiosResponse<{ accessToken: string; refreshToken?: string }> =
          await axios.post(`${API_URL}/api/v1/auth/refresh`, { token: refreshToken });

        if (res.data.accessToken) {
          await SecureStore.setItemAsync("accessToken", res.data.accessToken);
          if (res.data.refreshToken) {
            await SecureStore.setItemAsync("refreshToken", res.data.refreshToken);
          }
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${res.data.accessToken}`;
          return axiosInstance(originalRequest);
        }
        throw new Error("No access token in refresh response");
      } catch {
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        // Notify AuthContext so the app transitions to the login screen
        if (_onLogout) _onLogout();
      }
    }
    return Promise.reject(error);
  }
);

export const authRequest = async <T = any>(config: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance(config);
  return response.data;
};

export default axiosInstance;
