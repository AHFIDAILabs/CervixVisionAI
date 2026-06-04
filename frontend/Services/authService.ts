import { authRequest } from "../utils/axiosHelper";
import { RegisterPayload, LoginPayload, AuthResponse } from "../types/auth";
import * as SecureStore from "expo-secure-store";

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

const registerUser = async (data: RegisterPayload) => {
  return authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/v1/auth/register`,
    data,
  });
};

const loginUser = async (credentials: LoginPayload) => {
  return authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/v1/auth/login`,
    data: credentials,
  });
};

const refreshToken = async () => {
  const token = await SecureStore.getItemAsync("refreshToken");
  if (!token) throw new Error("No refresh token available");
  return authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/v1/auth/refresh`,
    data: { token },
  });
};

export { registerUser, loginUser, refreshToken };
