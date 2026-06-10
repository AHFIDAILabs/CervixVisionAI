import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Toast from "react-native-toast-message";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { useCentre } from "../../../Context/CentreContext";
import { runOnDeviceInference } from "../../../utils/onDeviceInference";
import { saveAnalysis } from "../../../db/database";
import { LocalAnalysis } from "../../../types/centre";
import { AppStackParamList } from "../../../types/AppStack";

type ScanNav = StackNavigationProp<AppStackParamList, "ScanScreen">;

// Ensure the images directory for a centre exists and return the dir path
async function ensureDir(centreCode: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}analyses/${centreCode}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

// Copy the picked image to permanent storage and return the saved URI
async function persistImage(sourceUri: string, centreCode: string, id: string): Promise<string> {
  const dir = await ensureDir(centreCode);
  const dest = `${dir}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export default function ScanScreen() {
  const navigation = useNavigation<ScanNav>();
  const { centre } = useCentre();

  const [image, setImage]       = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images", allowsEditing: true, quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images", allowsEditing: true, quality: 1,
          });
      if (!result.canceled) setImage(result.assets[0].uri);
    } catch {
      Toast.show({ type: "error", text1: "Could not open image picker." });
    }
  };

  const handleAnalyse = async () => {
    if (!image || !centre) return;

    setAnalysing(true);
    try {
      // 1. Run on-device ONNX ensemble inference
      const result = await runOnDeviceInference(image);

      // 2. Persist image to permanent local storage
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const savedPath = await persistImage(image, centre.code, id);

      // 3. Save result to SQLite
      const analysis: LocalAnalysis = {
        id,
        centreCode:        centre.code,
        imagePath:         savedPath,
        prediction:        result.prediction,
        confidence:        result.confidence,
        risk_score:        result.risk_score,
        risk_level:        result.risk_level,
        uncertainty_score: result.uncertainty_score,
        uncertainty_level: result.uncertainty_level,
        lesion_class:      result.lesion_class,
        recommendation:    result.recommendation,
        source:            "on_device",
        createdAt:         new Date().toISOString(),
        synced:            false,
      };
      saveAnalysis(analysis);

      setImage(null);
      Toast.show({
        type: "success",
        text1: `Result: ${result.prediction}`,
        text2: result.risk_level,
        visibilityTime: 4000,
      });
      navigation.navigate("ResultsScreen");
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Analysis failed",
        text2: "Please try again with a clearer image.",
      });
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <DashboardLayout>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Cervical Scan</Text>
        <Text style={styles.subtitle}>
          Capture or upload a VIA cervical image. Analysis runs instantly on this device — no internet needed.
        </Text>

        {/* Image preview / drop zone */}
        <TouchableOpacity
          style={styles.uploadBox}
          activeOpacity={0.8}
          onPress={() => pickImage(false)}
          disabled={analysing}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <>
              <MaterialIcons name="add-photo-alternate" size={52} color="#0EA5A4" />
              <Text style={styles.uploadText}>Tap to upload from gallery</Text>
              <Text style={styles.uploadHint}>or use the Camera button below</Text>
            </>
          )}
        </TouchableOpacity>

        {image ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setImage(null)} disabled={analysing}>
            <Text style={styles.clearText}>✕  Remove image</Text>
          </TouchableOpacity>
        ) : null}

        {/* Centre identifier badge */}
        {centre ? (
          <View style={styles.centreBadge}>
            <MaterialIcons name="local-hospital" size={14} color="#0EA5A4" />
            <Text style={styles.centreText}>{centre.name}  ·  {centre.code}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
            onPress={() => pickImage(true)}
            disabled={analysing}
          >
            <MaterialIcons name="photo-camera" size={22} color="#fff" />
            <Text style={styles.btnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#0EA5A4" }, !image && styles.btnDisabled]}
            onPress={handleAnalyse}
            disabled={analysing || !image}
          >
            {analysing ? (
              <>
                <ActivityIndicator color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Analysing…</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="biotech" size={22} color="#fff" />
                <Text style={styles.btnText}>Analyse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {analysing ? (
          <Text style={styles.inferenceNote}>
            Running AI model on device. This may take a few seconds…
          </Text>
        ) : null}
      </ScrollView>
      <BottomNavigationBar active="scan" />
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container:    { flexGrow: 1, padding: 20, backgroundColor: "#f9fafb" },
  title:        { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle:     { fontSize: 14, color: "#6b7280", marginBottom: 20, lineHeight: 20 },
  uploadBox: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 2,
    borderStyle: "dashed", borderColor: "#0EA5A4",
    justifyContent: "center", alignItems: "center",
    paddingVertical: 40, paddingHorizontal: 20, marginBottom: 10,
    minHeight: 200,
  },
  previewImage: { width: "100%", height: 220, borderRadius: 12, resizeMode: "cover" },
  uploadText:   { marginTop: 10, fontSize: 15, color: "#374151", fontWeight: "600" },
  uploadHint:   { marginTop: 4, fontSize: 13, color: "#9ca3af" },
  clearBtn:     { alignSelf: "flex-end", marginBottom: 10 },
  clearText:    { color: "#ef4444", fontSize: 13, fontWeight: "500" },
  centreBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f0fdfa", borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, alignSelf: "flex-start", marginBottom: 16,
    borderWidth: 1, borderColor: "#99f6e4",
  },
  centreText:   { fontSize: 12, color: "#0f766e", fontWeight: "600" },
  actionsRow:   { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    flex: 1, paddingVertical: 14, borderRadius: 12,
  },
  btnDisabled:  { opacity: 0.4 },
  btnText:      { color: "#fff", fontWeight: "700", marginLeft: 6, fontSize: 15 },
  inferenceNote:{ marginTop: 16, fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 18 },
});
