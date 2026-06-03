import { authRequest } from "../utils/axiosHelper";
import { RegisterPayload, LoginPayload, AuthResponse } from "../types/auth";
import * as SecureStore from "expo-secure-store";
import { User } from "../types/userType";

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

// 📝 Register
const registerUser = async (data: RegisterPayload) => {
  return authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/v1/auth/register`,
    data,
  });
};

// 🔑 Login
// services/authService.ts
// services/authService.ts
const loginUser = async (credentials: LoginPayload) => {
  console.log("Login Request Payload:", credentials); // Debug log
  const response = await authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/v1/auth/login`,
    data: credentials,
  });
  console.log("Login Response:", JSON.stringify(response, null, 2)); // Debug log
  return response;
};

// 👤 Profile
// const getProfile = async () => {
//   return authRequest<{ user: User }>({
//     method: "GET",
//     url: `${baseURL}/api/v1/auth/me`,
//   });
// };

// 🔄 Refresh Token
const refreshToken = async () => {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) throw new Error("No refresh token available");

  

  return authRequest<AuthResponse>({
    method: "POST",
    url: `${baseURL}/api/auth/refresh`, // Matches the backend route
    data: { token: refreshToken },
  });
};

export { registerUser, loginUser, refreshToken };