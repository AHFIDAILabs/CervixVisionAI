import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { useCentre } from "../../../Context/CentreContext";
import { getAnalysesByCentre } from "../../../db/database";
import { AppStackParamList } from "../../../types/AppStack";

type DashboardNav = StackNavigationProp<AppStackParamList, "DashboardScreen">;

export default function DashboardScreen() {
  const { centre, logout } = useCentre();
  const navigation = useNavigation<DashboardNav>();

  const [totalScans, setTotalScans]   = useState(0);
  const [lastResult, setLastResult]   = useState<string>("None");
  const [positiveCount, setPositiveCount] = useState(0);

  const refreshSummary = useCallback(() => {
    if (!centre) return;
    const analyses = getAnalysesByCentre(centre.code);
    setTotalScans(analyses.length);
    setPositiveCount(analyses.filter((a) => a.prediction === "Positive").length);
    if (analyses[0]) {
      setLastResult(`${analyses[0].prediction} — ${analyses[0].risk_level}`);
    }
  }, [centre]);

  // useFocusEffect re-runs every time this screen comes into focus (e.g. after
  // navigating back from ScanScreen), keeping the summary panels up to date.
  useFocusEffect(refreshSummary);

  return (
    <DashboardLayout>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Centre header */}
        <View style={styles.centreCard}>
          <MaterialIcons name="local-hospital" size={28} color="#0EA5A4" />
          <View style={{ flex: 1 }}>
            <Text style={styles.centreName}>{centre?.name ?? "Health Centre"}</Text>
            <Text style={styles.centreCode}>Code: {centre?.code}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{totalScans}</Text>
            <Text style={styles.summaryLabel}>Total Scans</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#ef4444" }]}>{positiveCount}</Text>
            <Text style={styles.summaryLabel}>Positive</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#10b981" }]}>
              {totalScans - positiveCount}
            </Text>
            <Text style={styles.summaryLabel}>Negative</Text>
          </View>
        </View>

        <View style={styles.lastResultCard}>
          <Text style={styles.lastResultLabel}>Last result</Text>
          <Text style={styles.lastResultValue}>{lastResult}</Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ScanScreen")}>
            <MaterialIcons name="photo-camera" size={32} color="#0EA5A4" />
            <Text style={styles.cardText}>New Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ResultsScreen")}>
            <MaterialIcons name="history" size={32} color="#2563eb" />
            <Text style={styles.cardText}>All Results</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("StatisticsScreen")}>
            <MaterialIcons name="bar-chart" size={32} color="#16a34a" />
            <Text style={styles.cardText}>Statistics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("SettingScreen")}>
            <MaterialIcons name="settings" size={32} color="#6b7280" />
            <Text style={styles.cardText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={22} color="#fff" />
          <Text style={styles.logoutText}>Switch Centre</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNavigationBar active="dashboard" />
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  centreCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#f0fdfa", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#99f6e4", marginBottom: 16,
  },
  centreName:    { fontSize: 18, fontWeight: "700", color: "#111827" },
  centreCode:    { fontSize: 13, color: "#0f766e", fontWeight: "600", marginTop: 2 },
  summaryRow:    { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
    alignItems: "center", elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3,
  },
  summaryNumber: { fontSize: 28, fontWeight: "800", color: "#111827" },
  summaryLabel:  { fontSize: 12, color: "#6b7280", marginTop: 2, textAlign: "center" },
  lastResultCard:{
    backgroundColor: "#f3f4f6", borderRadius: 12, padding: 14, marginBottom: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  lastResultLabel:{ fontSize: 13, color: "#6b7280" },
  lastResultValue:{ fontSize: 14, fontWeight: "700", color: "#111827", flex: 1, textAlign: "right" },
  sectionTitle:  { fontSize: 17, fontWeight: "600", color: "#1f2937", marginBottom: 12 },
  grid:          { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%", backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: 24, alignItems: "center", marginBottom: 16, elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardText: { marginTop: 8, fontSize: 14, fontWeight: "600", color: "#374151", textAlign: "center" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#6b7280", borderRadius: 14, paddingVertical: 14, marginTop: 8,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 8 },
});
