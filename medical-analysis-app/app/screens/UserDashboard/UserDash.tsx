import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { AppStackParamList } from "../../../types/AppStack";



type DashboardNav = StackNavigationProp<AppStackParamList, "DashboardScreen">;

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<DashboardNav>();

  return (
    <DashboardLayout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcome}>Hi {user?.firstName || "User"} 👋</Text>
        <Text style={styles.subtitle}>Welcome back to your health dashboard.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Health Summary</Text>
          <Text style={styles.summaryText}>Last Result: Pending</Text>
          <Text style={styles.summaryText}>Next Appointment: Oct 10, 2025</Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ResultsScreen")}
          >
            <MaterialIcons name="hourglass-top" size={32} color="#2563eb" />
            <Text style={styles.cardText}>Pending Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ResultsScreen")}
          >
            <MaterialIcons name="history" size={32} color="#16a34a" />
            <Text style={styles.cardText}>My History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ScanScreen")}
          >
            <MaterialIcons name="cloud-upload" size={32} color="#9333ea" />
            <Text style={styles.cardText}>Upload Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("UserProfileScreen")}
          >
            <MaterialIcons name="person" size={32} color="#f59e0b" />
            <Text style={styles.cardText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notificationCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.notificationText}>1 new result available</Text>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
               <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("SettingScreen")}
        >
          <MaterialIcons name="settings" size={32} color="#6b7280" />
          <Text style={styles.cardText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

 
      </ScrollView>
     <BottomNavigationBar active="dashboard" /> 
    </DashboardLayout>
    
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  welcome: { fontSize: 22, fontWeight: "bold", color: "#111827", marginBottom: 6 },
  subtitle: { color: "#6b7280", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1f2937", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardText: { marginTop: 8, fontSize: 14, fontWeight: "600", color: "#374151", textAlign: "center" },
  summaryCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", color: "#1f2937", marginBottom: 8 },
  summaryText: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  notificationText: { fontSize: 14, color: "#374151", marginBottom: 8 },
  viewAllBtn: { alignSelf: "flex-end" },
  viewAllText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
    elevation: 4,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
});