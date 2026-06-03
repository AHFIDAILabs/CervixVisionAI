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

type AnalysisResult = {
  _id: string;
  type: string;
  status: string;
  createdAt: string;
  results?: { summary?: string };
};

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

  const renderItem = ({ item: r }: { item: AnalysisResult }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{r.type.replace("_", " ").toUpperCase()}</Text>
        <View
          style={[
            styles.statusBadge,
            r.status === "completed" || r.status === "delivered" || r.status === "reviewed"
              ? styles.completed
              : r.status === "pending" || r.status === "in_progress"
              ? styles.pending
              : styles.failed,
          ]}
        >
          <Text style={styles.statusText}>{r.status.replace("_", " ")}</Text>
        </View>
      </View>

      <Text style={styles.dateText}>
        📅 {new Date(r.createdAt).toLocaleDateString()}
      </Text>

      {r.results?.summary ? (
        <Text style={styles.notes}>📝 {r.results.summary}</Text>
      ) : (
        <Text style={styles.noNotes}>Awaiting results</Text>
      )}
    </TouchableOpacity>
  );

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
    paddingBottom: 80, // leave room for BottomNavigationBar
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
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  completed: {
    backgroundColor: "#10b981", // green
  },
  pending: {
    backgroundColor: "#f59e0b", // orange
  },
  failed: {
    backgroundColor: "#ef4444", // red
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
  },
  notes: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 20,
  },
  noNotes: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#9ca3af",
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
