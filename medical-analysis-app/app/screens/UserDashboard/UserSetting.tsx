import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import BottomNavigationBar from "../../Components/BottomBar";
import DashboardLayout from "./DashboardLayout";

const SETTINGS_KEY = "app_user_settings";

type RootStackParamList = {
  Dashboard: undefined;
  Results: undefined;
  Profile: undefined;
  Settings: undefined;
};

type SettingsNav = StackNavigationProp<RootStackParamList, "Settings">;

export default function Settings() {
  const { logout } = useAuth();
  const navigation = useNavigation<SettingsNav>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(SETTINGS_KEY).then((val) => {
      if (val) {
        const saved = JSON.parse(val);
        setNotificationsEnabled(saved.notificationsEnabled ?? true);
        setDataSharingEnabled(saved.dataSharingEnabled ?? false);
      }
    });
  }, []);

  const saveSettings = (notifications: boolean, dataSharing: boolean) => {
    SecureStore.setItemAsync(
      SETTINGS_KEY,
      JSON.stringify({ notificationsEnabled: notifications, dataSharingEnabled: dataSharing })
    );
  };

  const handleNotificationsChange = (val: boolean) => {
    setNotificationsEnabled(val);
    saveSettings(val, dataSharingEnabled);
  };

  const handleDataSharingChange = (val: boolean) => {
    setDataSharingEnabled(val);
    saveSettings(notificationsEnabled, val);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: logout, style: "destructive" },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "Are you sure? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: () => alert("Delete API call pending"), style: "destructive" },
    ]);
  };

  return (
    <DashboardLayout>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.settingsCard}>
       
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            trackColor={{ false: "#e5e7eb", true: "#2563eb" }}
            thumbColor={notificationsEnabled ? "#fff" : "#f4f4f4"}
            onValueChange={handleNotificationsChange}
            value={notificationsEnabled}
          />
        </View>

       
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Share Data with Doctors</Text>
          <Switch
            trackColor={{ false: "#e5e7eb", true: "#16a34a" }}
            thumbColor={dataSharingEnabled ? "#fff" : "#f4f4f4"}
            onValueChange={handleDataSharingChange}
            value={dataSharingEnabled}
          />
        </View>

      
        <TouchableOpacity style={styles.settingItem} onPress={() => alert("Change Password flow coming soon")}>
          <Text style={styles.settingLabel}>Change Password</Text>
          <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
          <Text style={styles.settingLabel}>Delete Account</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ef4444" />
        </TouchableOpacity>

    
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Theme</Text>
          <Text style={styles.settingValue}>Light (Coming Soon)</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Language</Text>
          <Text style={styles.settingValue}>English (Coming Soon)</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
          <BottomNavigationBar active="settings" />

    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, backgroundColor: "#f3f4f6" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerText: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  settingsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 3 },
  settingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  settingLabel: { fontSize: 16, color: "#1f2937", fontWeight: "500" },
  settingValue: { fontSize: 16, color: "#6b7280" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    elevation: 4,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
});