import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { downloadModels, DownloadProgress } from "../../utils/modelManager";

interface Props {
  onComplete: () => void;
}

export default function ModelDownloadScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDownload = useCallback(async () => {
    setError(null);
    setDownloading(true);
    try {
      await downloadModels(setProgress);
      onComplete();
    } catch (err: any) {
      setError(
        err?.message ||
          "Download failed. Check your internet connection and try again."
      );
    } finally {
      setDownloading(false);
    }
  }, [onComplete]);

  useEffect(() => {
    startDownload();
  }, [startDownload]);

  const percent = progress ? Math.round(progress.fraction * 100) : 0;

  return (
    <View style={styles.container}>
      <MaterialIcons name="cloud-download" size={64} color="#0EA5A4" />
      <Text style={styles.title}>Setting Up AI Models</Text>
      <Text style={styles.subtitle}>
        CervixVision AI needs to download its on-device AI models (~380MB).
        This is a one-time download — after this, the app works fully offline.
      </Text>

      {downloading ? (
        <>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percentText}>
            {percent}%
            {progress ? `  ·  File ${progress.fileIndex + 1} of ${progress.fileCount}` : ""}
          </Text>
          <ActivityIndicator color="#0EA5A4" style={{ marginTop: 12 }} />
        </>
      ) : null}

      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={startDownload}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Retry Download</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={styles.hint}>
        Connect to Wi-Fi for the fastest download. You only need to do this once per device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 32, backgroundColor: "#f9fafb",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 20, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 10, lineHeight: 20 },
  progressBarBg: {
    width: "100%", height: 10, borderRadius: 6, backgroundColor: "#e5e7eb",
    marginTop: 32, overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#0EA5A4", borderRadius: 6 },
  percentText: { fontSize: 14, color: "#374151", fontWeight: "600", marginTop: 10 },
  errorText: { fontSize: 14, color: "#ef4444", textAlign: "center", marginTop: 24 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#0EA5A4", borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 24, marginTop: 16,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 8 },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 32 },
});
