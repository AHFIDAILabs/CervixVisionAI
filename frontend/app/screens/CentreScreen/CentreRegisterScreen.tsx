import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Clipboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCentre } from "../../../Context/CentreContext";
import { CentreStackParamList } from "../../../types/centre";

type Nav = NativeStackNavigationProp<CentreStackParamList, "CentreRegisterScreen">;

export default function CentreRegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { registerCentre } = useCentre();

  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter the health centre name.");
      return;
    }
    setLoading(true);
    try {
      const code = await registerCentre(name.trim());
      setGeneratedCode(code);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) Clipboard.setString(generatedCode);
    Alert.alert("Copied", "Centre code copied to clipboard.");
  };

  if (generatedCode) {
    return (
      <View style={styles.screen}>
        <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={64} color="#10b981" />
          <Text style={styles.successTitle}>Centre Registered!</Text>
          <Text style={styles.successSub}>{name.trim()}</Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Your centre code</Text>
            <Text style={styles.codeText}>{generatedCode}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
              <MaterialIcons name="content-copy" size={16} color="#2563eb" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={18} color="#d97706" />
            <Text style={styles.warningText}>
              Write this code down. You will need it every time you open the app on this device.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => {/* CentreContext already set centre */}}>
            <Text style={styles.primaryBtnText}>Start Screening →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

      <MaterialIcons name="local-hospital" size={56} color="#0EA5A4" style={styles.icon} />
      <Text style={styles.title}>Register Health Centre</Text>
      <Text style={styles.subtitle}>
        Enter your health centre or clinic name. A unique code will be generated for this device.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Ikeja General Hospital"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, (!name.trim() || loading) && styles.btnDisabled]}
        onPress={handleRegister}
        disabled={!name.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Register Centre</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate("CentreLoginScreen")}>
        <Text style={styles.linkText}>Already registered? Enter your code →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: "#fff", padding: 28, alignItems: "center" },
  backBtn: { alignSelf: "flex-start", marginBottom: 24, padding: 4 },
  icon: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  input: {
    width: "100%", borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#111827",
    backgroundColor: "#f9fafb", marginBottom: 20,
  },
  primaryBtn: {
    width: "100%", backgroundColor: "#0EA5A4", paddingVertical: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 16,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.45 },
  linkBtn: { padding: 8 },
  linkText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  // success state
  successCard: {
    flexGrow: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, gap: 12,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  successSub: { fontSize: 16, color: "#6b7280" },
  codeBox: {
    width: "100%", backgroundColor: "#f0fdf4", borderRadius: 16,
    borderWidth: 2, borderColor: "#10b981", padding: 20,
    alignItems: "center", marginVertical: 8,
  },
  codeLabel: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  codeText: { fontSize: 36, fontWeight: "800", letterSpacing: 4, color: "#111827", marginBottom: 12 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyText: { color: "#2563eb", fontWeight: "600" },
  warningBox: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#fffbeb", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#fde68a",
  },
  warningText: { flex: 1, fontSize: 13, color: "#92400e", lineHeight: 18 },
});
