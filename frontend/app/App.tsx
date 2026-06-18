import React from "react";
import { View, Text, ScrollView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CentreProvider } from "../Context/CentreContext";
import AppNavigator from "./navigation/AppNavigator";
import Toast from "react-native-toast-message";

// Catches render-phase exceptions that React silently swallows in production,
// preventing them from blanking the screen with no feedback.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={{ flex: 1, padding: 24, paddingTop: 60, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#dc2626", marginBottom: 12 }}>
            App Error (report this)
          </Text>
          <ScrollView>
            <Text style={{ fontSize: 13, color: "#374151", fontFamily: "monospace" }}>
              {error.message}
            </Text>
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, fontFamily: "monospace" }}>
              {error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <CentreProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <Toast />
          </CentreProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
