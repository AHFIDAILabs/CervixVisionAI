import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Switch,
  ScrollView, Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useCentre } from "../../../Context/CentreContext";
import BottomNavigationBar from "../../Components/BottomBar";
import DashboardLayout from "./DashboardLayout";

const SETTINGS_KEY = "app_user_settings";

export default function Settings() {
  const { centre, logout } = useCentre();
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

  const handleSwitchCentre = () => {
    Alert.alert(
      "Switch Centre",
      "This will return you to the centre login screen. Your locally saved scans will remain on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Switch", onPress: logout, style: "destructive" },
      ]
    );
  };

  return (
    <DashboardLayout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {centre ? (
          <View style={styles.centreCard}>
            <MaterialIcons name="local-hospital" size={20} color="#0EA5A4" />
            <View>
              <Text style={styles.centreName}>{centre.name}</Text>
              <Text style={styles.centreCode}>{centre.code}</Text>
            </View>
          </View>
        ) : null}

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

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Theme</Text>
            <Text style={styles.settingValue}>Light (Coming Soon)</Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Language</Text>
            <Text style={styles.settingValue}>English (Coming Soon)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchCentre}>
          <MaterialIcons name="logout" size={22} color="#fff" />
          <Text style={styles.switchText}>Switch Centre</Text>
        </TouchableOpacity>

        <Text style={styles.version}>CervixVision AI  ·  v1.0.0  ·  On-device inference</Text>
      </ScrollView>

      <BottomNavigationBar active="settings" />
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, backgroundColor: "#f3f4f6" },
  centreCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f0fdfa", borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: "#99f6e4", marginBottom: 20,
  },
  centreName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  centreCode: { fontSize: 12, color: "#0f766e", fontWeight: "600", marginTop: 2 },
  settingsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 3, marginBottom: 20 },
  settingItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  settingLabel: { fontSize: 16, color: "#1f2937", fontWeight: "500" },
  settingValue: { fontSize: 16, color: "#6b7280" },
  switchBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#6b7280", borderRadius: 12, paddingVertical: 14, elevation: 3,
  },
  switchText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 8 },
  version: { textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 20 },
});
