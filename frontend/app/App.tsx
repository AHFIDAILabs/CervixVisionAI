import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CentreProvider } from "../Context/CentreContext";
import AppNavigator from "./navigation/AppNavigator";
import Toast from "react-native-toast-message";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CentreProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <Toast />
      </CentreProvider>
    </GestureHandlerRootView>
  );
}
