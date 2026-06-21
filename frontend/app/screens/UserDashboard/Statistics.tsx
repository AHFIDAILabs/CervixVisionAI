import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { useCentre } from "../../../Context/CentreContext";
import { getAnalysesByCentre } from "../../../db/database";
import { LocalAnalysis } from "../../../types/centre";

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total === 0 ? "—" : `${((n / total) * 100).toFixed(0)}%`;
}

function avg(values: number[]) {
  return values.length === 0
    ? "—"
    : `${((values.reduce((a, b) => a + b, 0) / values.length) * 100).toFixed(1)}%`;
}

// ── Stat row component ────────────────────────────────────────────────────────

function StatRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon as any} size={18} color="#0EA5A4" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const { centre } = useCentre();
  const [data, setData] = useState<LocalAnalysis[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (centre) setData(getAnalysesByCentre(centre.code));
    }, [centre])
  );

  const total    = data.length;
  const positive = data.filter((d) => d.prediction === "Positive").length;
  const negative = total - positive;

  const highRisk = data.filter((d) => d.risk_level === "High Risk").length;
  const modRisk  = data.filter((d) => d.risk_level === "Moderate Risk").length;
  const lowRisk  = data.filter((d) => d.risk_level === "Low Risk").length;

  const highUncert = data.filter((d) => d.uncertainty_level === "High").length;

  const avgRisk = avg(data.map((d) => d.risk_score));
  const avgConf = avg(data.map((d) => d.confidence));

  // Last 7 days
  const cutoff   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent   = data.filter((d) => new Date(d.createdAt) >= cutoff);
  const recentPos = recent.filter((d) => d.prediction === "Positive").length;

  const lastScanDate = data[0]
    ? new Date(data[0].createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "—";

  return (
    <DashboardLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Statistics</Text>
        {centre ? (
          <View style={styles.centreChip}>
            <MaterialIcons name="local-hospital" size={14} color="#0EA5A4" />
            <Text style={styles.centreChipText}>{centre.name}  ·  {centre.code}</Text>
          </View>
        ) : null}

        {total === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="bar-chart" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No scans yet — statistics will appear here after the first analysis.</Text>
          </View>
        ) : (
          <>
            {/* Overview */}
            <Section title="Overview" icon="summarize">
              <StatRow label="Total Scans" value={String(total)} />
              <StatRow label="Last Scan" value={lastScanDate} />
              <StatRow label="Last 7 Days" value={`${recent.length} scan${recent.length !== 1 ? "s" : ""}`} sub={`${recentPos} positive in period`} />
            </Section>

            {/* Predictions */}
            <Section title="Predictions" icon="fact-check">
              <StatRow label="Positive" value={`${positive}  (${pct(positive, total)})`} color="#ef4444" />
              <StatRow label="Negative" value={`${negative}  (${pct(negative, total)})`} color="#10b981" />
            </Section>

            {/* Risk levels */}
            <Section title="Risk Levels" icon="warning-amber">
              <StatRow label="High Risk"     value={`${highRisk}  (${pct(highRisk, total)})`}  color="#ef4444" />
              <StatRow label="Moderate Risk" value={`${modRisk}  (${pct(modRisk, total)})`}    color="#f59e0b" />
              <StatRow label="Low Risk"      value={`${lowRisk}  (${pct(lowRisk, total)})`}    color="#10b981" />
            </Section>

            {/* AI metrics */}
            <Section title="AI Metrics" icon="insights">
              <StatRow
                label="Avg Risk Score"
                sub="Mean acetowhite probability across all scans"
                value={avgRisk}
                color="#374151"
              />
              <StatRow
                label="Avg Confidence"
                sub="Mean AI decisiveness across all scans"
                value={avgConf}
                color="#374151"
              />
              <StatRow
                label="High Uncertainty"
                sub="Scans flagged for human review"
                value={`${highUncert}  (${pct(highUncert, total)})`}
                color={highUncert > 0 ? "#f59e0b" : "#10b981"}
              />
            </Section>

            <Text style={styles.note}>
              All statistics are computed from locally stored scans on this device.
            </Text>
          </>
        )}
      </ScrollView>
      <BottomNavigationBar active="results" />
    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { padding: 20, paddingBottom: 100, backgroundColor: "#f9fafb" },
  title:          { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  centreChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 5, alignSelf: "flex-start", marginBottom: 20,
    borderWidth: 1, borderColor: "#99f6e4",
  },
  centreChipText: { fontSize: 12, color: "#0f766e", fontWeight: "600" },
  section:        { marginBottom: 20 },
  sectionHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle:   { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  statLabel:      { fontSize: 14, color: "#374151", fontWeight: "500" },
  statSub:        { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  statValue:      { fontSize: 15, fontWeight: "700", color: "#111827", textAlign: "right" },
  note: {
    fontSize: 11, color: "#9ca3af", textAlign: "center",
    marginTop: 8, lineHeight: 16,
  },
  empty:          { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyText:      { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 16, lineHeight: 20 },
});
