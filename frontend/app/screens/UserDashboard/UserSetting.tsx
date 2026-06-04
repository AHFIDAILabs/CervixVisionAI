import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch,
  ScrollView, Alert, Modal, ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import BottomNavigationBar from "../../Components/BottomBar";
import DashboardLayout from "./DashboardLayout";
import axiosInstance from "../../../utils/axiosHelper";

const SETTINGS_KEY = "app_user_settings";
const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

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

  // Change-password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

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

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return Alert.alert("Missing Fields", "Please fill in all password fields.");
    }
    if (newPwd !== confirmPwd) {
      return Alert.alert("Mismatch", "New password and confirmation do not match.");
    }
    if (newPwd.length < 6) {
      return Alert.alert("Too Short", "New password must be at least 6 characters.");
    }
    setPwdLoading(true);
    try {
      await axiosInstance.put(`${baseURL}/api/v1/users/change-password`, {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      setShowPasswordModal(false);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      Alert.alert("Success", "Password changed successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axiosInstance.delete(`${baseURL}/api/v1/users/account`);
              await logout();
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete account.");
            }
          },
        },
      ]
    );
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

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowPasswordModal(true)}>
            <Text style={styles.settingLabel}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <Text style={[styles.settingLabel, { color: "#ef4444" }]}>Delete Account</Text>
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

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.input}
              placeholder="Current password"
              secureTextEntry
              value={currentPwd}
              onChangeText={setCurrentPwd}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              secureTextEntry
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#e5e7eb" }]}
                onPress={() => { setShowPasswordModal(false); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#2563eb" }]}
                onPress={handleChangePassword}
                disabled={pwdLoading}
              >
                {pwdLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: "#fff", fontWeight: "600" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#ef4444", borderRadius: 8, paddingVertical: 12,
    marginTop: 20, elevation: 4,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "88%", gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, color: "#111827" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
});
