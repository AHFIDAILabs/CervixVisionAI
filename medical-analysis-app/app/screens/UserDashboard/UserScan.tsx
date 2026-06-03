import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DashboardLayout from "./DashboardLayout";
import BottomNavigationBar from "../../Components/BottomBar";
import { uploadScan } from "../../../Services/userService";

const SCAN_TYPES = [
  { label: "General", value: "general" },
  { label: "X-Ray", value: "xray" },
  { label: "MRI", value: "mri" },
  { label: "CT Scan", value: "ct_scan" },
  { label: "Blood Test", value: "blood_test" },
  { label: "Urine Test", value: "urine_test" },
  { label: "Other", value: "other" },
];

export default function UploadScanScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [scanType, setScanType] = useState("general");
  const [uploading, setUploading] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: "images", allowsEditing: true, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, quality: 1 });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setImageMime(result.assets[0].mimeType ?? "image/jpeg");
      }
    } catch {
      Alert.alert("Error", "Something went wrong while picking the image.");
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert("No file selected", "Please pick a scan to upload.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("scan", {
        uri: image,
        name: `scan_${Date.now()}.jpg`,
        type: imageMime,
      } as any);
      formData.append("type", scanType);

      await uploadScan(formData);
      Alert.alert("Uploaded", "Your scan has been submitted for review.");
      setImage(null);
    } catch {
      Alert.alert("Upload Failed", "Could not upload scan. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Upload Your Scan</Text>
        <Text style={styles.subtitle}>
          Choose a file from your gallery or take a photo of your scan.
        </Text>

        <View style={styles.pickerBox}>
          <Picker
            selectedValue={scanType}
            onValueChange={(v) => setScanType(v)}
            style={styles.picker}
            dropdownIconColor="#6b7280"
          >
            {SCAN_TYPES.map((t) => (
              <Picker.Item key={t.value} label={t.label} value={t.value} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={styles.uploadBox}
          activeOpacity={0.8}
          onPress={() => pickImage(false)}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <>
              <MaterialIcons name="cloud-upload" size={48} color="#9333ea" />
              <Text style={styles.uploadText}>Tap to select from gallery</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
            onPress={() => pickImage(true)}
          >
            <MaterialIcons name="photo-camera" size={24} color="#fff" />
            <Text style={styles.btnText}>Use Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#9333ea" }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.btnText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <BottomNavigationBar active="scan" />
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#fff",
    height: 50,
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  picker: {
    color: "#111827",
    width: "100%",
    height: "100%",
  },
  uploadBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#9333ea",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginBottom: 20,
  },
  uploadText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b7280",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
});
