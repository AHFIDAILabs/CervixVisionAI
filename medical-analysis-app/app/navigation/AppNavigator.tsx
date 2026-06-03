// navigation/AppNavigator.tsx
import React from "react";
import { useAuth } from "../../Context/AuthContext";
import AppStack from "./AppStack";
import AuthStack from "./AuthStack";

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // TODO: replace with splash screen

  return user ? <AppStack /> : <AuthStack />;
}
