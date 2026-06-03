// screens/UserDashboard/DashboardLayout.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import AppHeader from "../../Components/Header";
import { useAuth } from "../../../Context/AuthContext";

const FALLBACK_AVATAR = require("../../../assets/Logo.png");

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const route = useRoute();

  // Map route names to titles
  const getTitle = () => {
    switch (route.name) {
      case "Dashboard":
        return "Dashboard";
      case "ResultsScreen":
        return "My Results";
      case "UserProfile":
        return "My Profile";
      case "ScanScreen":
        return "My Scan";
      case "SettingScreen":
        return "Update Settings";
      case "UserProfileScreen":
        return "My Profile"
      default:
        return "Dashboard";
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        type="private"
        title={getTitle()}
        avatar={user?.userImage ? { uri: user.userImage } : FALLBACK_AVATAR}
        recipientId={user?.id}
        showBack={route.name !== "Dashboard"} // back button only for sub-screens
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { flex: 1 },
});
