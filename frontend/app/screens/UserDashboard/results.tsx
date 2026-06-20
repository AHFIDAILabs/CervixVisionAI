import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ActivityIndicator, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, ScrollView, Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { useCentre } from "../../../Context/CentreContext";
import { getAnalysesByCentre } from "../../../db/database";
import { LocalAnalysis } from "../../../types/centre";

// ── Helpers ───────────────────────────────────────────────────────────────────

const riskColour = (risk_level?: string) => {
  if (!risk_level) return "#6b7280";
  const l = risk_level.toLowerCase();
  if (l.includes("high"))     return "#ef4444";
  if (l.includes("moderate")) return "#f59e0b";
  return "#10b981";
};

// Dynamic clinical interpretation combining all three metrics.
// This replaces the single static recommendation string with context-aware text.
function clinicalInterpretation(r: LocalAnalysis): { title: string; detail: string; color: string } {
  const riskPct  = (r.risk_score  * 100).toFixed(1);
  const confPct  = (r.confidence  * 100).toFixed(1);
  const highU    = r.uncertainty_level === "High";

  if (r.prediction === "Negative") {
    return highU
      ? {
          title:  "Borderline Negative — Follow-up Advised",
          detail: `Risk Score ${riskPct}% with AI Confidence only ${confPct}%. The model leans negative but is uncertain — finding sits near the detection boundary. Consider repeat examination or review at the next screening cycle.`,
          color:  "#f59e0b",
        }
      : {
          title:  "Likely Clear — Routine Follow-up",
          detail: `Risk Score ${riskPct}%, AI Confidence ${confPct}%. The model is reasonably confident of a negative finding. Reassure the patient and schedule routine screening as per protocol.`,
          color:  "#10b981",
        };
  }

  // Positive predictions — four scenarios from the interpretation table
  const risk = r.risk_score;
  if (risk >= 0.65 && !highU) {
    return {
      title:  "High Risk — Refer Urgently",
      detail: `Risk Score ${riskPct}%, AI Confidence ${confPct}%. Clear acetowhite finding with moderate-to-strong model decisiveness. Refer to a qualified specialist without delay.`,
      color:  "#ef4444",
    };
  }
  if (risk >= 0.65 && highU) {
    return {
      title:  "High Risk — Specialist Review Required",
      detail: `Risk Score ${riskPct}% but AI Confidence is only ${confPct}%. High-risk score despite uncertain image or ambiguous findings. Do not delay specialist referral — clinician must assess image quality.`,
      color:  "#ef4444",
    };
  }
  if (risk >= 0.50) {
    return {
      title:  "Moderate Risk — Clinical Review Needed",
      detail: `Risk Score ${riskPct}%, AI Confidence ${confPct}%. Positive finding with moderate model confidence. Consult a healthcare professional for further evaluation before any clinical decision.`,
      color:  "#f59e0b",
    };
  }
  // 0.30–0.50: barely above threshold
  return {
    title:  "Borderline Positive — Human Review Essential",
    detail: `Risk Score ${riskPct}% barely above the detection threshold, AI Confidence only ${confPct}%. The model is almost undecided — result is essentially inconclusive. A trained clinician must review the image before any clinical action is taken.`,
    color:  "#f97316",
  };
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ result, onClose }: { result: LocalAnalysis | null; onClose: () => void }) {
  if (!result) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.headerTitle}>CERVICAL SCAN</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={26} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.body}>
          <Text style={modal.date}>
            {new Date(result.createdAt).toLocaleString(undefined, {
              dateStyle: "medium", timeStyle: "short",
            })}
          </Text>

          {/* Prediction banner */}
          <View style={[modal.banner,
            { backgroundColor: result.prediction === "Positive" ? "#fef2f2" : "#f0fdf4" }]}>
            <View style={[modal.predBadge,
              { backgroundColor: result.prediction === "Positive" ? "#ef4444" : "#10b981" }]}>
              <Text style={modal.predText}>{result.prediction}</Text>
            </View>
            <Text style={[modal.riskText, { color: riskColour(result.risk_level) }]}>
              {result.risk_level}
            </Text>
          </View>

          {/* Metrics grid */}
          <View style={modal.metricsGrid}>
            {([
              {
                label:    "Risk Score",
                sub:      "Acetowhite likelihood",
                value:    `${(result.risk_score  * 100).toFixed(1)}%`,
                color:    riskColour(result.risk_level),
              },
              {
                label:    "Confidence",
                sub:      "AI decisiveness",
                value:    `${(result.confidence  * 100).toFixed(1)}%`,
                color:    result.confidence >= 0.5 ? "#10b981" : "#f59e0b",
              },
              {
                label:    "Uncertainty",
                sub:      "Human check needed",
                value:    result.uncertainty_level,
                color:    result.uncertainty_level === "High" ? "#f59e0b" : "#10b981",
              },
            ] as const).map(({ label, sub, value, color }) => (
              <View style={modal.metricBox} key={label}>
                <Text style={modal.metricLabel}>{label}</Text>
                <Text style={modal.metricSub}>{sub}</Text>
                <Text style={[modal.metricValue, { color }]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Captured image */}
          <View style={modal.section}>
            <Text style={modal.sectionTitle}>Captured Image</Text>
            <Image source={{ uri: result.imagePath }} style={modal.scanImage} resizeMode="cover" />
          </View>

          {/* Clinical Interpretation */}
          {(() => {
            const interp = clinicalInterpretation(result);
            return (
              <View style={modal.section}>
                <Text style={modal.sectionTitle}>Clinical Interpretation</Text>
                <View style={[modal.interpCard, { borderLeftColor: interp.color }]}>
                  <Text style={[modal.interpTitle, { color: interp.color }]}>{interp.title}</Text>
                  <Text style={modal.sectionBody}>{interp.detail}</Text>
                </View>
              </View>
            );
          })()}

          {/* Centre ID */}
          <View style={modal.centreRow}>
            <MaterialIcons name="local-hospital" size={14} color="#0EA5A4" />
            <Text style={modal.centreText}>Centre: {result.centreCode}</Text>
            <Text style={modal.centreText}>  ·  Source: On-device AI</Text>
          </View>

          {/* Disclaimer */}
          <View style={modal.disclaimer}>
            <MaterialIcons name="info-outline" size={16} color="#6b7280" />
            <Text style={modal.disclaimerText}>
              AI-generated screening report only. Not a diagnosis. Confirm with a qualified clinician.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const { centre } = useCentre();
  const [results, setResults]       = useState<LocalAnalysis[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState<LocalAnalysis | null>(null);

  const loadResults = useCallback(() => {
    if (centre) setResults(getAnalysesByCentre(centre.code));
  }, [centre]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const onRefresh = () => {
    setRefreshing(true);
    loadResults();
    setRefreshing(false);
  };

  const renderItem = ({ item: r }: { item: LocalAnalysis }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setSelected(r)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>CERVICAL SCAN</Text>
        <View style={[styles.statusBadge,
          { backgroundColor: r.prediction === "Positive" ? "#ef4444" : "#10b981" }]}>
          <Text style={styles.statusText}>{r.prediction}</Text>
        </View>
      </View>

      <Text style={styles.dateText}>
        {new Date(r.createdAt).toLocaleDateString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        })}
      </Text>

      <View style={styles.mlBlock}>
        <View style={styles.mlRow}>
          <Text style={[styles.riskLevel, { color: riskColour(r.risk_level) }]}>
            {r.risk_level}
          </Text>
          <Text style={styles.lesionClass}>
            {r.lesion_class.replace(/_/g, " ")}
          </Text>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={styles.metricValue}>{(r.confidence * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Risk Score</Text>
            <Text style={styles.metricValue}>{(r.risk_score * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Uncertainty</Text>
            <Text style={[styles.metricValue,
              { color: r.uncertainty_level === "High" ? "#f59e0b" : "#10b981" }]}>
              {r.uncertainty_level}
            </Text>
          </View>
        </View>
        <Text style={styles.tapHint}>Tap to view full report →</Text>
      </View>
    </TouchableOpacity>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptySubtitle}>
        Capture or upload a cervical image to see AI results here.
      </Text>
    </View>
  );

  return (
    <DashboardLayout>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Scan Results</Text>
            {centre ? (
              <View style={styles.centreHeader}>
                <MaterialIcons name="local-hospital" size={14} color="#0EA5A4" />
                <Text style={styles.centreHeaderText}>{centre.name}  ·  {centre.code}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0EA5A4"]} />
        }
      />
      <BottomNavigationBar active="results" />
      <DetailModal result={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 80, backgroundColor: "#f9fafb" },
  title:           { fontSize: 24, fontWeight: "700", marginBottom: 8, color: "#111827" },
  centreHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 5, alignSelf: "flex-start", marginBottom: 16,
    borderWidth: 1, borderColor: "#99f6e4",
  },
  centreHeaderText:{ fontSize: 12, color: "#0f766e", fontWeight: "600" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle:       { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText:      { fontSize: 11, fontWeight: "700", color: "#fff" },
  dateText:        { fontSize: 13, color: "#9ca3af", marginBottom: 12 },
  mlBlock:         { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, gap: 8 },
  mlRow:           { flexDirection: "row", alignItems: "center", gap: 12 },
  riskLevel:       { fontSize: 14, fontWeight: "700" },
  lesionClass:     { fontSize: 12, color: "#6b7280", fontStyle: "italic" },
  metricsRow:      { flexDirection: "row", justifyContent: "space-between" },
  metric:          { alignItems: "center", flex: 1 },
  metricLabel:     { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  metricValue:     { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  tapHint:         { fontSize: 12, color: "#0EA5A4", textAlign: "right", marginTop: 2 },
  emptyContainer:  { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 18, fontWeight: "600", color: "#6b7280", marginTop: 16, marginBottom: 8 },
  emptySubtitle:   { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20 },
});

const modal = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  headerTitle:  { fontSize: 18, fontWeight: "700", color: "#111827" },
  body:         { padding: 20, paddingBottom: 60 },
  date:         { fontSize: 13, color: "#9ca3af", marginBottom: 16 },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  predBadge:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  predText:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  riskText:     { fontSize: 16, fontWeight: "700" },
  metricsGrid: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 20,
  },
  metricBox:    { alignItems: "center", flex: 1 },
  metricLabel:  { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  metricSub:    { fontSize: 9, color: "#d1d5db", marginBottom: 4, textAlign: "center" },
  metricValue:  { fontSize: 16, fontWeight: "700", color: "#111827" },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  sectionBody:  { fontSize: 14, color: "#374151", lineHeight: 22 },
  interpCard: {
    borderLeftWidth: 4, borderRadius: 8,
    backgroundColor: "#fafafa", paddingHorizontal: 14, paddingVertical: 12,
  },
  interpTitle:  { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  scanImage:    { width: "100%", height: 240, borderRadius: 12, backgroundColor: "#f3f4f6" },
  centreRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f0fdfa", borderRadius: 8, padding: 10, marginBottom: 16,
  },
  centreText:   { fontSize: 12, color: "#0f766e", fontWeight: "600" },
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#f3f4f6", borderRadius: 10, padding: 12,
  },
  disclaimerText: { fontSize: 12, color: "#6b7280", lineHeight: 18, flex: 1 },
});
