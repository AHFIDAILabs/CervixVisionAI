import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { getMyAnalyses } from "../../../Services/userService";
import { AnalysisResult } from "../../../types/common";

export default function ResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setError(null);
      const res = await getMyAnalyses();
      setResults(res.analyses ?? []);
    } catch {
      setError("Could not load results. Pull down to retry.");
    }
  };

  useEffect(() => {
    fetchResults().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResults().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loaderText}>Fetching your results...</Text>
      </View>
    );
  }

  const riskColour = (risk_level?: string) => {
    if (!risk_level) return "#6b7280";
    if (risk_level.toLowerCase().includes("high")) return "#ef4444";
    if (risk_level.toLowerCase().includes("moderate")) return "#f59e0b";
    return "#10b981";
  };

  const renderItem = ({ item: r }: { item: AnalysisResult }) => {
    const ml = r.ml_results;
    const isCompleted = ["completed", "delivered", "reviewed"].includes(r.status);
    const isPending = ["pending", "in_progress"].includes(r.status);

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {r.type.replace(/_/g, " ").toUpperCase()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isCompleted ? styles.completed : isPending ? styles.pending : styles.failed,
            ]}
          >
            <Text style={styles.statusText}>{r.status.replace(/_/g, " ")}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {new Date(r.createdAt).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </Text>

        {/* ML Results block */}
        {ml ? (
          <View style={styles.mlBlock}>
            {/* Prediction + risk */}
            <View style={styles.mlRow}>
              <View style={[
                styles.predictionBadge,
                { backgroundColor: ml.prediction === "Positive" ? "#ef4444" : "#10b981" },
              ]}>
                <Text style={styles.predictionText}>{ml.prediction}</Text>
              </View>
              <Text style={[styles.riskLevel, { color: riskColour(ml.risk_level) }]}>
                {ml.risk_level}
              </Text>
            </View>

            {/* Confidence + risk score */}
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
                <Text style={[
                  styles.metricValue,
                  { color: ml.uncertainty_level === "High" ? "#f59e0b" : "#10b981" },
                ]}>
                  {ml.uncertainty_level}
                </Text>
              </View>
            </View>

            {/* Recommendation */}
            <Text style={styles.recommendationLabel}>Recommendation</Text>
            <Text style={styles.recommendationText}>{ml.recommendation}</Text>
          </View>
        ) : (
          <Text style={styles.noNotes}>
            {isPending ? "Analysis in progress…" : "Awaiting results"}
          </Text>
        )}
      </View>
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
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 80,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    flexShrink: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  completed: { backgroundColor: "#10b981" },
  pending:   { backgroundColor: "#f59e0b" },
  failed:    { backgroundColor: "#ef4444" },
  dateText: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 12,
  },
  mlBlock: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    gap: 10,
  },
  mlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  predictionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  predictionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  riskLevel: {
    fontSize: 14,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    alignItems: "center",
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },
  noNotes: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#9ca3af",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 20,
  },
});
