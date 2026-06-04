import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../Context/AuthContext";
import { SocketProvider } from "../Context/SocketContext";
import AppNavigator from "./navigation/AppNavigator";
import Toast from "react-native-toast-message";

export default function App() {
  return (
    // GestureHandlerRootView is required by react-native-gesture-handler
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* SocketProvider inside AuthProvider so it can read the authenticated user */}
        <SocketProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <Toast />
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
