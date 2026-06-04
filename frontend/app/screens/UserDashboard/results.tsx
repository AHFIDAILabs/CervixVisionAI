import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { getMyAnalyses } from "../../../Services/userService";
import { AnalysisResult, MlResults } from "../../../types/common";
import { useSocket } from "../../../Context/SocketContext";

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({
  result,
  onClose,
}: {
  result: AnalysisResult | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const ml = result.ml_results;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={modal.container}>
        {/* Header */}
        <View style={modal.header}>
          <Text style={modal.headerTitle}>
            {result.type.replace(/_/g, " ").toUpperCase()}
          </Text>
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

          {ml ? (
            <>
              {/* Prediction banner */}
              <View
                style={[
                  modal.banner,
                  { backgroundColor: ml.prediction === "Positive" ? "#fef2f2" : "#f0fdf4" },
                ]}
              >
                <View
                  style={[
                    modal.predBadge,
                    { backgroundColor: ml.prediction === "Positive" ? "#ef4444" : "#10b981" },
                  ]}
                >
                  <Text style={modal.predText}>{ml.prediction}</Text>
                </View>
                <Text
                  style={[
                    modal.riskText,
                    { color: riskColour(ml.risk_level) },
                  ]}
                >
                  {ml.risk_level}
                </Text>
              </View>

              {/* Metrics grid */}
              <View style={modal.metricsGrid}>
                {[
                  { label: "Confidence",   value: `${(ml.confidence * 100).toFixed(1)}%` },
                  { label: "Risk Score",   value: `${(ml.risk_score * 100).toFixed(1)}%` },
                  { label: "Uncertainty",  value: ml.uncertainty_level },
                ].map(({ label, value }) => (
                  <View style={modal.metricBox} key={label}>
                    <Text style={modal.metricLabel}>{label}</Text>
                    <Text style={modal.metricValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Grad-CAM visualisation */}
              {ml.xai_output ? (
                <View style={modal.section}>
                  <Text style={modal.sectionTitle}>AI Visualisation (Grad-CAM)</Text>
                  <Text style={modal.sectionSubtitle}>
                    Heat-map highlights the regions that influenced the prediction.
                  </Text>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${ml.xai_output}` }}
                    style={modal.gradCam}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {/* Recommendation */}
              <View style={modal.section}>
                <Text style={modal.sectionTitle}>Clinical Recommendation</Text>
                <Text style={modal.sectionBody}>{ml.recommendation}</Text>
              </View>

              {/* Full clinical report */}
              <View style={modal.section}>
                <Text style={modal.sectionTitle}>Full Clinical Report</Text>
                <View style={modal.reportBox}>
                  <Text style={modal.reportText}>{ml.clinical_report}</Text>
                </View>
              </View>

              {/* Disclaimer */}
              <View style={modal.disclaimer}>
                <MaterialIcons name="info-outline" size={16} color="#6b7280" />
                <Text style={modal.disclaimerText}>
                  AI-generated screening report only. Not a diagnosis. Confirm with a qualified clinician.
                </Text>
              </View>
            </>
          ) : (
            <View style={modal.pendingBox}>
              <ActivityIndicator color="#9333ea" size="large" />
              <Text style={modal.pendingText}>Analysis in progress…</Text>
              <Text style={modal.pendingSubtext}>
                You will be notified when the result is ready.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const riskColour = (risk_level?: string) => {
  if (!risk_level) return "#6b7280";
  const l = risk_level.toLowerCase();
  if (l.includes("high"))     return "#ef4444";
  if (l.includes("moderate")) return "#f59e0b";
  return "#10b981";
};

// ── Results Screen ────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const [loading, setLoading]         = useState(true);
  const [results, setResults]         = useState<AnalysisResult[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<AnalysisResult | null>(null);
  const { lastAnalysisUpdate }        = useSocket();

  const fetchResults = async () => {
    try {
      setError(null);
      const res = await getMyAnalyses();
      setResults(res.analyses ?? []);
    } catch {
      setError("Could not load results. Pull down to retry.");
    }
  };

  useEffect(() => { fetchResults().finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (lastAnalysisUpdate) fetchResults();
  }, [lastAnalysisUpdate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResults().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loaderText}>Fetching your results…</Text>
      </View>
    );
  }

  const renderItem = ({ item: r }: { item: AnalysisResult }) => {
    const ml          = r.ml_results;
    const isCompleted = ["completed", "delivered", "reviewed"].includes(r.status);
    const isPending   = ["pending", "in_progress"].includes(r.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setSelected(r)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{r.type.replace(/_/g, " ").toUpperCase()}</Text>
          <View style={[
            styles.statusBadge,
            isCompleted ? styles.completed : isPending ? styles.pending : styles.failed,
          ]}>
            <Text style={styles.statusText}>{r.status.replace(/_/g, " ")}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {new Date(r.createdAt).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </Text>

        {ml ? (
          <View style={styles.mlBlock}>
            <View style={styles.mlRow}>
              <View style={[styles.predictionBadge, {
                backgroundColor: ml.prediction === "Positive" ? "#ef4444" : "#10b981",
              }]}>
                <Text style={styles.predictionText}>{ml.prediction}</Text>
              </View>
              <Text style={[styles.riskLevel, { color: riskColour(ml.risk_level) }]}>
                {ml.risk_level}
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>{(ml.confidence * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Risk Score</Text>
                <Text style={styles.metricValue}>{(ml.risk_score * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Uncertainty</Text>
                <Text style={[styles.metricValue, {
                  color: ml.uncertainty_level === "High" ? "#f59e0b" : "#10b981",
                }]}>{ml.uncertainty_level}</Text>
              </View>
            </View>
            <Text style={styles.tapHint}>Tap to view full report & AI visualisation →</Text>
          </View>
        ) : (
          <Text style={styles.noNotes}>
            {isPending ? "Analysis in progress…" : "Awaiting results"}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No results yet</Text>
      <Text style={styles.emptySubtitle}>
        {error ?? "Upload a scan and your results will appear here."}
      </Text>
    </View>
  );

  return (
    <DashboardLayout>
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={<Text style={styles.title}>My Results</Text>}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
        }
      />
      <BottomNavigationBar active="results" />
      <DetailModal result={selected} onClose={() => setSelected(null)} />
    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 80, backgroundColor: "#f9fafb" },
  title:            { fontSize: 24, fontWeight: "700", marginBottom: 20, color: "#111827" },
  loaderContainer:  { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loaderText:       { marginTop: 10, fontSize: 16, color: "#6b7280" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle:        { fontSize: 16, fontWeight: "700", color: "#1f2937", flexShrink: 1, marginRight: 8 },
  statusBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText:       { fontSize: 11, fontWeight: "600", color: "#fff", textTransform: "capitalize" },
  completed:        { backgroundColor: "#10b981" },
  pending:          { backgroundColor: "#f59e0b" },
  failed:           { backgroundColor: "#ef4444" },
  dateText:         { fontSize: 13, color: "#9ca3af", marginBottom: 12 },
  mlBlock:          { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, gap: 10 },
  mlRow:            { flexDirection: "row", alignItems: "center", gap: 10 },
  predictionBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  predictionText:   { color: "#fff", fontWeight: "700", fontSize: 13 },
  riskLevel:        { fontSize: 14, fontWeight: "600" },
  metricsRow:       { flexDirection: "row", justifyContent: "space-between" },
  metric:           { alignItems: "center", flex: 1 },
  metricLabel:      { fontSize: 11, color: "#9ca3af", marginBottom: 2 },
  metricValue:      { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  tapHint:          { fontSize: 12, color: "#9333ea", textAlign: "right", marginTop: 4 },
  noNotes:          { fontSize: 14, fontStyle: "italic", color: "#9ca3af", marginTop: 6 },
  emptyContainer:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:       { fontSize: 18, fontWeight: "600", color: "#6b7280", marginTop: 16, marginBottom: 8 },
  emptySubtitle:    { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20 },
});

const modal = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  headerTitle:    { fontSize: 18, fontWeight: "700", color: "#111827", flexShrink: 1 },
  body:           { padding: 20, paddingBottom: 60 },
  date:           { fontSize: 13, color: "#9ca3af", marginBottom: 16 },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  predBadge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  predText:       { color: "#fff", fontWeight: "700", fontSize: 14 },
  riskText:       { fontSize: 16, fontWeight: "700" },
  metricsGrid: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 20,
  },
  metricBox:      { alignItems: "center", flex: 1 },
  metricLabel:    { fontSize: 11, color: "#9ca3af", marginBottom: 4 },
  metricValue:    { fontSize: 16, fontWeight: "700", color: "#111827" },
  section:        { marginBottom: 20 },
  sectionTitle:   { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 6 },
  sectionSubtitle:{ fontSize: 12, color: "#6b7280", marginBottom: 10 },
  sectionBody:    { fontSize: 14, color: "#374151", lineHeight: 22 },
  gradCam: {
    width: "100%", height: 260, borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  reportBox: {
    backgroundColor: "#f9fafb", borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  reportText:     { fontSize: 13, color: "#374151", lineHeight: 22, fontFamily: "monospace" },
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#f3f4f6", borderRadius: 10, padding: 12, marginBottom: 8,
  },
  disclaimerText: { fontSize: 12, color: "#6b7280", lineHeight: 18, flex: 1 },
  pendingBox:     { alignItems: "center", paddingVertical: 60, gap: 12 },
  pendingText:    { fontSize: 18, fontWeight: "600", color: "#374151" },
  pendingSubtext: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
});
