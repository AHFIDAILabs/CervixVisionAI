import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { getProfile } from "../Services/userService"; // Updated to use the service
import { User } from "../types/userType";
import { AuthResponse } from "../types/auth";
import { normalizeUser } from "../utils/imageHelper";

// --- Context Interface ---
interface AuthContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: (tokenOverride?: string) => Promise<void>;
  handleSuccessfulAuth: (res: AuthResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🚪 Logout
  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  };

  // ✅ Function to handle state and secure storage updates (called from screens)
const handleSuccessfulAuth = async (res: AuthResponse) => {
    console.log("[AUTH] Original User Image:", res.user.userImage); // 👈 Log Original
    const normalizedUser = normalizeUser(res.user); 
    console.log("[AUTH] Normalized User Image:", normalizedUser.userImage); // 👈 Log Normalized
    setUser(normalizedUser);
  setAccessToken(res.accessToken);
    await SecureStore.setItemAsync("accessToken", res.accessToken);
    if (res.refreshToken) {
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
    }
  };

  // 🔄 Refresh profile (Memoized for useEffect dependency)
  const refreshProfile = useCallback(async (tokenOverride?: string) => {
  const tokenToUse = tokenOverride || accessToken;
  if (!tokenToUse) return;

  try {
    const res = await getProfile();
    console.log("[REFRESH] Original User Image:", res.user.userImage); // 👈 Log Original
    const normalizedUser = normalizeUser(res.user); 
    console.log("[REFRESH] Normalized User Image:", normalizedUser.userImage); // 👈 Log Normalized
    setUser(normalizedUser);
  } catch (err: any) {
      console.error("Error refreshing profile:", err);
      if (err.response?.status === 401) {
      const retryRes = await getProfile();
      const normalizedUser = normalizeUser(retryRes.user); // <-- NEW on retry
      setUser(normalizedUser);
    } else {
      throw err;
    }
  }
}, [accessToken]);

  // 🔑 Initial Load from secure storage
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          setAccessToken(token);
          try {
            await refreshProfile(token);
          } catch (profileError) {
            console.error("Token found but profile refresh failed. Cleaning up.", profileError);
            await logout();
          }
        }
      } catch (err) {
        console.error("Failed to load auth:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, accessToken, setAccessToken, loading, logout, refreshProfile, handleSuccessfulAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};