import React from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import AppHeader from "../../Components/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const route = useRoute();

  const getTitle = () => {
    switch (route.name) {
      case "DashboardScreen": return "Dashboard";
      case "ResultsScreen":   return "Scan Results";
      case "ScanScreen":      return "New Scan";
      case "SettingScreen":   return "Settings";
      default:                return "Dashboard";
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={getTitle()}
        showBack={route.name !== "DashboardScreen"}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content:   { flex: 1 },
});
