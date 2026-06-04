import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { getProfile } from "../Services/userService";
import { User } from "../types/userType";
import { AuthResponse } from "../types/auth";
import { normalizeUser } from "../utils/imageHelper";
import { setLogoutCallback } from "../utils/axiosHelper";

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

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  }, []);

  const handleSuccessfulAuth = async (res: AuthResponse) => {
    setUser(normalizeUser(res.user));
    setAccessToken(res.accessToken);
    await SecureStore.setItemAsync("accessToken", res.accessToken);
    if (res.refreshToken) {
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
    }
  };

  const refreshProfile = useCallback(async (tokenOverride?: string) => {
    const tokenToUse = tokenOverride || accessToken;
    if (!tokenToUse) return;
    try {
      const res = await getProfile();
      setUser(normalizeUser(res.user));
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
      if (err.response?.status === 401) {
        const retryRes = await getProfile();
        setUser(normalizeUser(retryRes.user));
      } else {
        throw err;
      }
    }
  }, [accessToken]);

  // Register the logout callback so axiosHelper can trigger it when
  // a token refresh fails (avoids a circular dependency between the two modules).
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          setAccessToken(token);
          try {
            await refreshProfile(token);
          } catch {
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
  }, [refreshProfile, logout]);

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
